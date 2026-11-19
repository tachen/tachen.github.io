---
layout: post
title: "高通 Adreno GPU 架构演进与技术剖析"
date: "2026-08-23 10:07:40 +0800"
author: tachen
original_url: https://zhuanlan.zhihu.com/p/2074796866290688262
ai_assisted_creation: "包含 AI 辅助创作"
creation_disclaimer: "包含 AI 辅助创作 作者对内容负责"
---

![高通 Adreno GPU 架构演进与技术剖析]({{ site.baseurl }}/img/posts/2026-08-23-adreno-gpu/v2-8d0483e6aca64648b267063a61bf52ce.jpg)

前篇：Arm Mali GPU 架构演进与技术剖析

[Arm Mali GPU 架构演进与技术剖析]({{ site.baseurl }}/2026/08/09/mali-gpu/)

### 引言：高通 Adreno 是如何炼成的？移动端图形巨头的底层进化史

2009 年，高通（Qualcomm）以约 6,500 万美元的价格，从陷入困境的 AMD 手中买下了其移动图形部门——也就是原 ATI 的 Imageon 团队。谁也没想到，这次收购孕育出了移动芯片史上生命力最顽强的图形品牌之一：Adreno。

熟悉电脑显卡的朋友听到 “Adreno” 这个名字可能会觉得眼熟，没错，它正是桌面级显卡巨头 “Radeon” 字母重新排列后的变体。

继承了 ATI 移动管线基因的高通，在过去十余年中走了一条与 Arm Mali 截然不同的硬件道路：

如果说 Arm Mali 代表了“精简芯片片上缓存、高度依赖物理总线无损压缩（AFBC）”的极致性价比路线；那么高通 Adreno 则是“重度堆叠片上物理 SRAM（GMEM）+ 动态混合渲染”的豪门堆料路线。凭着庞大的片上高速缓存与极其强悍的驱动调度，Adreno 在 Android 旗舰阵营中长期占据着性能与能效的制高点。

本文将延续硬核拆解视角，深度剖析高通 Adreno GPU 的底层硬件机制、GMEM 与 Mali Tile Memory 的本质差异，以及 5 大代际微架构变迁。

## 一、 核心底层机制：TBDR 与片上 GMEM 的豪门哲学

与桌面级 GPU（IMR 模式）极度依赖物理显存带宽不同，移动端 SoC 受限于 LPDDR 的物理带宽与严苛的功耗包络，必须采用 **TBDR（Tile-Based Deferred Rendering，贴片延迟渲染）**：将屏幕切割为独立的贴片区域（Bin/Tile），在片上高速缓存内集中完成单个 Tile 的全套像素着色与 Depth/Stencil 测试，最后一次性 Resolve（写回）到 System DRAM。

```
[桌面 IMR 模式]
Geometry/Vertex ──> Pixel Shader ──> 频繁读写 DRAM (高带宽、高功耗)

[Adreno TBDR 模式]
Geometry/Vertex ──> Binning Pass (确定像素归属 Tile)
                   └──> Pixel Shader (在片上 GMEM 集中完成) ──> 最终 Resolve 写回 DRAM
```

### 1. Tile 尺寸与片上缓存机制的本质差异：Adreno GMEM vs Mali Tile Buffer

在 TBDR 的具体实现中，高通 Adreno 的 **GMEM (Graphics Memory)** 与 Arm Mali 的 **Tile Buffer** 在设计哲学上有着根本不同：

- **Arm Mali (Tile Buffer)**：出于芯片面积与功耗考量，Mali 每个 Shader Core 仅挂载数 KB 至十几 KB 的微型 Buffer，默认采用固定的 16x16 像素微型 Tile。当渲染多目标渲染（MRT/G-Buffer）时，若数据量超过片上 Buffer 容限，硬件不得不被迫缩小 Tile 尺寸（如降至 8x8），导致全局 Tile 数量剧增，装配与 Resolve 开销成倍放大。
- **Qualcomm Adreno (GMEM)**：高通从设计之初就选择了“大 SRAM”路线。Adreno 拥有庞大的片上物理 GMEM（Graphics Memory），能够支持驱动根据当前渲染目标的格式、位深（Bit-Depth）、MSAA 采样倍数动态分配极大的 Bin 尺寸（通常为 64x64、128x128 甚至 256x256 像素）。即便遇到 4 到 5 张高精度 G-Buffer 附件，也能将完整的物理 Tile 像素属性留存在片上，彻底规避外挂 DRAM 的频繁读写。

| 移动端 Tile-Based 缓存机制对比 | Qualcomm Adreno (GMEM) | Arm Mali (Tile Buffer) |
| --- | --- | --- |
| 物理容量 | 大容量物理 SRAM（片上分配切片） | 极级精简（数 KB 至十几 KB / Core） |
| Tile 尺寸 | 动态大尺寸（64x64 至 256x256 像素） | 微型固定 Tile（16x16 像素） |
| 溢出机制 | FlexRender 逃逸（动态切回 IMR 模式） | 被迫缩小 Bin 尺寸（如降至 8x8） |
| 拓扑结构 | Sliced 分布式 / 集中挂载 | Shader Core 独占挂载 |

### 2. GMEM Unresolves 避险与 Concurrent Binning

虽然 GMEM 极其强大，但其核心瓶颈在于 **GMEM Load (Unresolve)**：即如果开发者没有显式 Clear/Invalidate 之前的 Framebuffer，GPU 必须将上一帧 DRAM 的数据重新 Reload 进 GMEM，造成额外的无谓性能损耗。

为了消除渲染流水线中的气泡（Bubbles），Adreno 从 A6xx 世代起全面优化了 **Concurrent Binning** 机制：

- 编译器会自动提取仅影响顶点位置的指令，生成 **Position-Only Vertex Shader**。
- Binning 管道与 Render 管道实现异步并行（Asynchronous Execution）：当上一帧的片段着色在 GMEM 中绘制时，下一帧的几何 Binning 已经并行运行在独立的几何管线上，极大地提升了硬件利用率（Hardware Utilization）。

## 二、 灵活应变的灵魂：FlexRender™ 混合渲染技术

纯粹的 TBDR 并非在所有场景下都是最优解。在面对复杂的 Compute Shader 交互、多次 Read-After-Write (RAW) 屏障、或者高频屏幕空间后处理（Post-Processing）时，频繁的 Tile 拆分（Binning）和 Tile 加载/写回反而会引发严重的性能惩罚。

高通为此开发了 **FlexRender™** 技术——一种由驱动与硬件微码共同主导的动态混合渲染模式。

```
┌──> [TBDR / Binning Mode] ───> 极低 DRAM 带宽 (适合复杂 PBR/大场景)
Workload 分析 ─┤
               └──> [Direct / IMR Mode] ────> 零 Binning 开销 (适合简单后处理/Compute 交互)
```

- **自动启发式分析（Heuristics）**：Adreno 驱动层会实时监控当前 Render Target 的渲染参数（如 Render Pass 的数量、屏障依赖关系、Draw Call 的几何密度）。
- **无缝模式切换**：

- **Binning 模式**：常规 3D 场景，压榨 GMEM 带宽优势。
- **Direct 模式（IMR）**：当检测到无需深度测试的全屏 Post-Processing（如 Bloom、Blur）或直接写 Globals 的 Compute 任务时，GPU 自动切回类似桌面级的 Direct 模式，绕过 Binning 开销，直接利用 L2 Cache/DRAM 进行渲染。

## 三、 Adreno 5 大微架构代际演进史

高通 Adreno 的微架构迭代可以清晰地划分为 5 个时代：

```
Adreno 2xx/3xx ──> Adreno 4xx/5xx ──> Adreno 6xx ───────> Adreno 7xx ─────────> Adreno 8xx (8 Elite)
(统一着色器架构)   (ASTC / Vulkan)   (LPAC / VRS T1)   (高效几何 / 硬件光追)  (Full Slice / 12MB 缓存池 / 统一内存)
```

### 1. Adreno 2xx / 3xx 时代：走向 Unified Shader 统一着色器

- **代表型号**：Adreno 220, Adreno 320（骁龙 600/800）
- **架构变革**：彻底摒弃了顶点着色器（VS）与片段着色器（PS）物理分离的旧设计，引入统一着色器架构（Unified Shader Architecture）。
- **技术突破**：正式引入 FlexRender 初级形态，为移动端提供了对 OpenGL ES 3.0 的完整支持。

### 2. Adreno 4xx / 5xx 时代：现代 API 与微块化重构

- **代表型号**：Adreno 430（骁龙 810）, Adreno 530（骁龙 820/835）
- **架构变革**：

- **ASTC 纹理压缩支持**：硬件级全面兼容 ASTC（Adaptive Scalable Texture Compression）。
- **Vulkan 1.0 原生适配**：重构微码逻辑，极大降低了 CPU 提交 Draw Call 的 Driver Overhead。
- **Split-Rendering 优化**：进阶的 GMEM 动态分配机制，支持将大的 Render Target 切分成更精细的物理小块。

### 3. Adreno 6xx 时代：现代 TBDR 的集大成者

- **代表型号**：Adreno 630（骁龙 845）, Adreno 650/660（骁龙 865/888）
- **架构变革**：

- **LPAC（Low Priority Asynchronous Compute，低优先级异步计算）**：允许 Compute Shader（如环境光遮蔽、Post-Processing）与 Graphics Pipeline 在硬件级别异步并行执行。
- **VRS Tier 1（可变着色率）**：支持基于 Draw Call / Primitive 级别的着色率调节（如 1x1、1x2、2x2），对外围非重点区域降采样着色。
- **UBWC（Universal Bandwidth Compression）**：在 GPU 全管线（包括 Depth Buffer、Color Buffer、Texture）推行通用无损内存压缩。

### 4. Adreno 7xx 时代：硬件光追落地与高能效管线

- **代表型号**：Adreno 730（骁龙 8 Gen 1）, Adreno 740/750（骁龙 8 Gen 2/3）
- **架构变革**：

- **硬件级光线追踪（Ray Tracing Accelerator）**：自 **Adreno 740（骁龙 8 Gen 2）** 起，硬件内首次塞入独立的 BVH 遍历（BVH Traversal）与 Ray-Triangle 交叉检测单元，正式开启移动端硬件光追时代。
- **VRS Tier 2 & SGSR**：支持基于 Image Mask / Surface 级别的细粒度可变着色率，并推出配合 Adreno 架构的单通道超分算法 SGSR（Snapdragon Game Super Resolution）。
- **几何与贴片效率重构**：优化渲染流水线的预剔除逻辑，支持更高效的 Mesh Shading 管线。

### 5. Adreno 8xx (8 Elite) 时代：全独立切片架构与超大缓存池

- **代表型号**：Adreno 830（Snapdragon 8 Elite / 骁龙 8 至尊版）
- **架构变革**：

- **Full Sliced Architecture（全独立切片架构）**：包含 3 个完全独立的高频 Slice（单 Slice 运行频率高达 1.1GHz+），从硬件物理层面解耦并提高并行扩展效率。
- **12MB 物理级超大片上缓存池**：每个 Slice 挂载 4MB 片上物理 GMEM/Cache，共计高达 12MB 的超大分布式缓存池，将 2K/4K 高分辨率渲染时的 DRAM 访问频率降到了历史最低点。
- **硬件级任务调度与指令流优化**：大幅提升前端任务分发效率，消除 CPU 到 GPU 的提交延迟。
- **与 Oryon CPU / Hexagon NPU 的完全缓存一致性**：基于统一内存架构（UMA），GPU 能直接无损读取 CPU 与 NPU 处理的数据，彻底实现零拷贝（Zero-Copy）。

## 四、 横向架构深度对比：Adreno vs Arm Mali vs Apple Silicon GPU

在移动图形领域，三大主流架构展现出了完全不同的设计哲学：

| 架构维度 | 高通 Adreno (以 A830 为例) | Arm Mali / Immortalis (G925 为例) | Apple Silicon GPU (以 A18 Pro 为例) |
| --- | --- | --- | --- |
| 底层核心模式 | TBDR + FlexRender 动态切换 | 纯粹 TBDR + DVS / Prepass | TBDR + 深度切片内存 (Tile Memory) |
| 片上缓存策略 | 大容量物理 GMEM + 12MB 物理缓存池 | 精简片上 Tile Buffer（数 KB/Core，强依赖 AFBC 压缩） | Tile Memory + 大容量 SLC (System Level Cache) |
| Tile 划分策略 | 动态大 Bin（64x64 到 256x256），高 G-Buffer 容忍度 | 微型 Bin（16x16），高 G-Buffer 下被迫缩小 Bin 尺寸 | 动态 Bin（16x16 / 32x32） |
| 渲染管线逃逸 | FlexRender（硬件级 TBDR / IMR 动态无缝切换） | 纯 TBDR（依赖 Fragment Prepass 与 DVS 优化） | TBDR（依赖 Driver 与 Metal 显式 Subpass 优化） |
| 指令集 (ISA) | Unified / Scalar Architecture | 从 VLIW 彻底转向 Scalar ISA (Valhall/5th-Gen) | Custom Scalar / SIMD Group |
| 几何管线优化 | Position-Only VS + Concurrent Binning | Deferred Vertex Shading (DVS) | Tile-Based Mesh Shading / Hardware Acceleration |
| 光线追踪硬件 | 硬件级 Ray Intersection + BVH 遍历 | RTUv2 硬件光追加速 | 硬件 Acceleration Engine (含光追/网格着色) |
| 跨平台适配力 | 极强（兼顾 Android 与 Windows on Snapdragon DX12） | 专注移动端（Android / Linux） | 专注 Apple 生态（Metal API / MetalFX） |

## 五、 总结与开发者启示

对比 Arm Mali 与 Qualcomm Adreno 的演进史，我们可以清晰地看到两条不同的硬件进化路线：

Arm Mali 选择了“指令集重构（VLIW 到 Scalar）+ 极度依赖总线压缩（AFBC）+ DVS 延迟滞后处理”的路线，尽量减少硬件本身的物理缓存尺寸，靠优秀的编译器与压缩协议取胜。Qualcomm Adreno 则选择了“重度依赖物理 SRAM（GMEM）+ FlexRender 动态管线切换 + Sliced 物理切片”的路线，用大缓存硬抗带宽惩罚，并用硬件调度器消除驱动开销。

对于现代游戏引擎架构师与图形开发者而言，在针对 Adreno 平台进行渲染管线优化时，应牢记以下原则：

1. **尽量保持在 GMEM 片内循环**：合理设置 Vulkan Subpasses 与 Transient Attachments，避免在渲染中间 Pass 时频繁将 Render Target 刷新到 DRAM。得益于 Adreno 庞大的 GMEM，在设计延迟渲染 G-Buffer 时拥有更高的带宽容忍空间。
2. **善用 FlexRender 与 Compute**：对于后处理与屏障极其复杂的 Pass，主动适配 Direct/IMR 模式或利用 LPAC（异步计算）填平管线气泡。
3. **拥抱 Sliced Architecture 与光追管线**：利用好 VRS Tier 2 & 硬件级 Ray Tracing Accelerator，在 2K/4K 移动端画质与功耗包络之间找到最佳平衡点。

## 参考链接

1. **Qualcomm Developer Docs**: [Qualcomm Adreno GPU - Game Developer Guide](https://docs.qualcomm.com/bundle/publicresource/topics/80-78185-2/gpu.html)
2. **Qualcomm Developer Docs**: [Overview & FlexRender Technology - Game Developer Guide](https://docs.qualcomm.com/bundle/publicresource/topics/80-78185-2/overview.html)
3. **Qualcomm Developer Docs**: [Adreno GPU on Mobile: Best Practices](https://docs.qualcomm.com/bundle/publicresource/topics/80-78185-2/mobile_best_practices.html)
4. **Mesa3D Official Documentation**: [Freedreno Driver Architecture & Hardware Acronyms](https://docs.mesa3d.org/drivers/freedreno.html)
5. **Arm Developer Official Blogs**: [The Mali GPU: An Abstract Machine & Tile-based Rendering](https://developer.arm.com/community/arm-community-blogs/b/mobile-graphics-and-gaming-blog/posts/the-mali-gpu-an-abstract-machine-part-2---tile-based-rendering)
