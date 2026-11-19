---
layout: post
title: "GPU 架构进化史（三）：Apple Silicon 极致 TBDR 与软硬协同"
date: "2026-09-05 11:42:33 +0800"
author: tachen
original_url: https://zhuanlan.zhihu.com/p/2079528104201082126
math: true
---

![GPU 架构进化史（三）：Apple Silicon 极致 TBDR 与软硬协同]({{ site.baseurl }}/img/posts/2026-09-05-apple-silicon-tbdr/v2-f5539c3e947e7e19f944ac97247c2bee.jpg)

[Arm Mali GPU 架构演进与技术剖析]({{ site.baseurl }}/2026/08/09/mali-gpu/)

[高通 Adreno GPU 架构演进与技术剖析]({{ site.baseurl }}/2026/08/23/adreno-gpu/)

> **【2026年9月7号版本修订说明】**

1. **突出“透明/镂空图元（Alpha Test /** **`discard`）处理”的核心对比视角**：将第二章剔除机制的对比主线，明确聚焦于**三大架构如何解决透明/镂空图元对 TBDR 深度剔除管线造成的 Stall（停顿）与 Fallback（失效退化）难题**；
2. **Apple Punch-Through 硬件解耦机制（A11 Bionic 首发，专利 US10074210B1）**：深入剖析 AGX 架构如何通过硬件级乱序提早执行 Visibility Shading 算出透明 Mask，解决传统 PowerVR 遇 Alpha Test（树叶、栅栏等）时的管线停顿痛点；
3. **Qualcomm Adreno LRZ 应对 Alpha Test 的三代演进（** $A5xx \rightarrow A6xx \rightarrow A7xx$ **）**：剖析 Adreno 从 A5xx 遇 `discard` 直接彻底关闭 LRZ，到 A6xx 引入 LRZ Feedback 允许 Rendering 阶段反向更新，再到 A7xx 双向 LRZ Buffer 的完整进化；
4. **Arm Mali 处理 Alpha Test 的代际退化与破局（** $Early-Z \rightarrow FPK \rightarrow FPP$ **）**：分析 Mali 从 Early-Z 遇 `discard` 被迫退化为 Late-Z，到 Valhall 队列 FPK，再到第 5 代架构（Immortalis-G925 / Mali-G725）Fragment Prepass (FPP) 的演进；
5. **三大方案整体对比总结**：在第二章末尾归纳整理三大架构解决 Alpha Test 剔除瓶颈的底层逻辑差异；
6. **Dynamic Caching 底层原理与 Gen 2（DC2）演进**：明确其核心为针对 Register Spill Memory 与 Local Scratch 的按需开辟（专利 **US11829298B2**），并剖析 DC2 通过硬件分配预判（Allocation Prefetching）解决 Latency 的工程方案。

## 前言与后续计划

在前面两篇文章中，我们分别探讨了高通 Adreno 凭借 FlexRender 展现的“极致灵活性”，以及 Arm Mali / Immortalis 架构从 VLIW 瓶颈向通用化超标量（Valhall）的“标准蜕变”。

本文将深入剖析 Apple Silicon GPU（AGX 架构）的核心竞争力。重点不在于简单陈述其参数，而是**着重对比 Apple 的** **TBDR** **实现与高通 Adreno、Arm Mali 在底层原理上的本质差异**：它是如何凭借**纯粹的 TBDR 范式**、**硬件级 HSR 剔除**、**完全开放可编程的 Tile** **SRAM** 以及与 **Metal API** **的深度协同**，建立起独特的性能与能耗壁垒。

> **【系列后续计划预览】** 在完成 Adreno、Mali 与 Apple AGX 三大架构的技术演进梳理后，计划是分析一款老硬件设备，重新再理解Tile 设计。

如果将视角转向 Apple 的 **Apple Silicon GPU（AGX 架构）**，其核心设计哲学可以用两组词概括：**极致的 TBDR 贯彻** 与 **无缝的软硬协同（Metal API 绑定）**。

与高通在 Direct Rendering (DR) 与 TBDR 之间动态切换的策略不同，苹果从早期依赖 Imagination PowerVR，到后续完全自研 AGX 架构，始终是**纯粹且极端的 Tile-Based Deferred Rendering (TBDR) 践行者**。通过将计算尽量锁定在片上的高速 Tile Memory 中，苹果在极低的功耗限制下实现了行业领先的渲染吞吐与能耗比。

## 一、 架构进化脉络：从 PowerVR 授权到完全自研 AGX

苹果的 GPU 路线经历了三个划时代的进化阶段：

```
+-----------------------------------------------------------------------------------+
| 阶段一：PowerVR 授权/定制 (A4 - A10)                                              |
| 依靠 PowerVR MBX / SGX / Rogue 架构，奠定早期 TBDR、早期 HSR 与 PVRTC 纹理压缩基础  |
+-----------------------------------------------------------------------------------+
                                       │
                                       ▼
+-----------------------------------------------------------------------------------+
| 阶段二：自研 AGX 架构成立 (A11 Bionic 至 A16 / M1 / M2)                           |
| 推出 Apple Family 4+，突破透明镂空图元 HSR 局限(Punch-Through 专利)，引入 Imageblocks |
+-----------------------------------------------------------------------------------+
                                       │
                                       ▼
+-----------------------------------------------------------------------------------+
| 阶段三：桌面级与光追重构 (A17 Pro / M3 / M4 / M5 及 Metal 4 时代)                 |
| Apple Family 9+，引入 Dynamic Caching (Gen 1/2)、硬件光追 (RTU) 与 Mesh Shading   |
+-----------------------------------------------------------------------------------+
```

## 二、 三大厂商 TBDR 底层剔除机制与半透明/镂空图元处理深度剖析

在渲染纯不透明几何体时，各大架构的 Overdraw 控制都较为优秀。**TBDR 硬件真正面临的生死考验，在于如何处理半透明、镂空及带有 Alpha Test /** **`discard`** **逻辑的几何图元（如树叶、草地、铁丝网等 Punch-Through 图元）。**

```
透明/镂空图元（Alpha Test / discard）处理机制演进对比:
├── Apple AGX:  [PowerVR 遇 Alpha 停顿] ──> [硬件 ISP + Punch-Through 旁路 (A11首发)] ──> 乱序提前计算 Mask，HSR 零停顿
├── Qualcomm:   [A5xx 遇 discard 关 LRZ] ──> [A6xx LRZ Feedback 渲染Pass补救]        ──> [A7xx 双向 Bidirectional LRZ]
└── Arm Mali:   [传统退化为 Late-Z]       ──> [Valhall 队列被动 FPK]                   ──> [5th Gen 架构 Fragment Prepass (FPP)]
```

### 1. 深度遮挡与透明图元剔除：Apple HSR vs 高通 LRZ vs Mali 机制链

- **Apple 硬件级 HSR 与 Punch-Through 突破**：

- **纯不透明几何体（硬件 ISP 单元）**：当几何体被划分到 Tile 后，片上独立的硬件 **ISP（Image Synthesis Processor）** 单元会在真正触发 Fragment Shader（FS）计算**之前**，在片上 SRAM 中评估该 Tile 内所有不透明图元。硬件自动追踪并仅保留最靠近摄像机的那一层像素片元，Overdraw 被降至理论极限。
- **Punch-Through（透明镂空/Alpha Test）硬件突破（A11 Bionic / Apple Family 4 首发）**： 在早期 PowerVR 时代，带有 `discard` 或 Alpha Test 的几何体（如树叶、栅栏，即 Punch-Through 图元）是 HSR 的硬伤。因为这类物体“透不透明”必须等 Fragment Shader（FS）跑完才知道，硬件无法提前把它们当实体墙挡住。如果直接挡住会渲染错误，如果不挡又会导致硬件 ISP 管线陷入死等停顿（Pipeline Stall）。  
  在 **A11 Bionic（Apple GPU Family 4）** 首发的自研 AGX 架构中，苹果通过专利技术（**US10074210B1 -** ***Punch-through techniques for graphics processing***）重构了此过程：AGX 开辟了一条**硬件级的极速预检通道**。带有 Alpha Test 的 Punch-Through 图元可以乱序（Out-of-Order）提前执行极精简的 Visibility Shading；一旦算出“哪里透光、哪里遮挡”的 Mask，时刻将结果反馈回 Tile Memory 中的 HSR 单元。后方真正被遮挡的图元依然能被**提前剔除**，管线完全无需死等，彻底解决了传统 PowerVR 遇到 Alpha Test 时性能陡降的痛点。

- **Qualcomm Adreno (LRZ 处理 Alpha Test /** **`discard`** **的三代演进)**：

- **底层物理机制**： Adreno 的 Low-Resolution Z（LRZ）本质上是一种**在 Binning 阶段构建低分辨率深度图（将** 4 x 4 或 8 x 8**像素块压缩为单个 LRZ 块区间）的粗粒度深度剔除机制**。但当遇到 Alpha Test 或 `discard` 图元时，LRZ 在不同代际展现出了完全不同的应对机制：
- **第一代：A5xx 时代（脆弱的 CPU 状态追踪，`discard`** **导致全局彻底关闭）**： Adreno 5xx 首次引入 LRZ。当 Binning 阶段检测到 Shader 中包含 `discard`、Alpha Test 或写深度（`gl_FragDepth`）时，硬件无法在 Binning 阶段写入正确的 LRZ 深度。初代 LRZ 的应对策略极其粗暴：**一旦发现这类图元，驱动会直接关闭整个 Render Pass 后续所有 Draw Calls 的 LRZ 剔除**。
- **第二代：A6xx 时代（GPU 端硬件追踪与 LRZ Feedback 机制）**： Adreno 6xx 将控制权交由 GPU 硬件（GRAS 模块），并引入了 **LRZ Feedback 机制**：针对在 Binning 阶段因 `discard` 无法写入 LRZ 的 Draw Calls，硬件允许其在 Rendering Pass 执行过程中，将算出的真实深度结果**实时反向反馈更新**至 LRZ Buffer，使随后的 Draw Calls 能够重新恢复 LRZ 剔除能力。
- **第三代：A7xx 时代（双向 Bidirectional LRZ 与并发 Binning）**： Adreno 7xx 引入 **Bidirectional LRZ（双向 LRZ）**，同时维持两套 LRZ Buffer（针对 `LESS` 与 `GREATER`），避免了中途更改深度比较方向或复杂 Alpha 状态切换导致的 LRZ 全局失效。然而，其本质依然受限：对于包含 `discard` 的具体 Draw Call 本身，在 Binning 阶段依然无法享受粗粒度剔除，且 LRZ Metadata 必须频繁在 GPU 与系统显存/System Cache 之间读写（占用 UCHE 缓存）。

- **Arm Mali（透明/镂空图元剔除从退化到预判的演进）**：

- **传统 Early-Z 的退化痛点**：Mali 架构具备光栅化后的 Early-Z 测试。然而，一旦 Fragment Shader 中包含 `discard` / Alpha Test，Early-Z 会直接硬件级失效，被迫**退化为 Late-Z**（FS 全部跑完后再测试 Z），导致大量无效 FS 计算与极高的 Overdraw。
- **Valhall 时代的 FPK (Forward Pixel Kill)**：为了缓解 Early-Z 失效后的 Overdraw，Arm 引入了基于 FIFO 队列的被动式 FPK 机制，允许队列后方的不透明片元在物理计算触发前抢占杀掉前方已被遮挡的片元。但对于 Alpha Test 图元本身，FPK 无法预知其透明 Mask，因此对镂空管线停顿帮助有限。
- **第 5 代架构的 FPP (Fragment Prepass)**：在最新一代（如 Immortalis-G925 / Mali-G725）中，Arm 引入了 **Fragment Prepass (FPP)** 机制，在主 Fragment Shader 执行前跑一个轻量级的 Prepass 阶段来提前评估 Visibility，从“被动队列抢占”升级为“主动 Prepass 预判”。

- **三大架构应对 Alpha Test / 镂空图元的整体逻辑总结**： 综合对比三大厂商处理 `discard` / Alpha Test 几何图元的策略，其底层哲学呈现出三条截然不同的技术路线：

1. **Apple（硬件物理解耦与片上旁路）**：在 Tile SRAM 侧由物理 **ISP 硬件 + PT 旁路** 联合处理，通过乱序提前执行精简 Visibility 着色生成 Mask，无需增加额外的渲染 Pass 或复杂的缓存同步，拥有最高的硬件确定性与剔除平滑度。
2. **Qualcomm（反馈更新与状态维护）**：由于 `discard` 导致 Binning 阶段 LRZ 深度无法直接写入，Adreno 通过从 A5xx（粗暴彻底关闭）到 A6xx（Rendering 阶段 Feedback 反向更新）再到 A7xx（双向 LRZ Buffer）的演进，尽最大可能降低 Alpha Test 图元对后续 Draw Calls 的性能污染。
3. **Arm Mali（流水线预判与队列抢占）**：从早期 Early-Z 的“直接退化为 Late-Z”，到 Valhall 的“被动 FPK 队列抢占”，再到 5th Gen 的“主动 Fragment Prepass (FPP)”，通过在流水线层面上增加 Prepass 预判逻辑，逐步消除 Early-Z 失效带来的 Overdraw 惩罚。

### 2. 渲染范式纯粹度：Apple 纯粹 TBDR vs 高通 FlexRender

- **Apple AGX**：**纯粹且极端的 TBDR**。Apple 硬件在芯片设计上没有为全局 IMR 模式准备高吞吐路径，所有图形管线强制经过 Binning 与 Tile SRAM。
- **Qualcomm Adreno (FlexRender)**：**混合策略**。Adreno 拥有 FlexRender 机制，驱动可以根据场景复杂度动态选择渲染路径：对于小纹理、重几何场景自动切换为 **Direct Rendering (DR)**；对于复杂像素着色场景切换为 **TBDR**。
- **Arm Mali**：同样是**纯粹 TBDR**，依赖强化的 Tile Buffer 与 AFBC 无损压缩。

## 三、 Tile Memory 深度打通与 Metal 极具侵略性的软硬协同

三家 GPU 都有片上 SRAM（Apple 叫 Tile Memory，Qualcomm 叫 GMEM，Mali 叫 Tile Buffer），但 **Apple 唯一将 Tile SRAM 的操控权完全开放给开发者**。

```
Tile SRAM 操控维度对比:
┌──────────────────┬──────────────────────────────────────────────────────────────┐
│ Apple AGX        │ 完全暴露给 API (Imageblocks / Tile Shaders / Memoryless)    │
├──────────────────┼──────────────────────────────────────────────────────────────┤
│ Qualcomm Adreno  │ 半隐式控制 (驱动管理 + Vulkan Subpass / RenderPass 协同)       │
├──────────────────┼──────────────────────────────────────────────────────────────┤
│ Arm Mali         │ 硬件/驱动黑盒 (依赖 AFBC 帧缓冲区无损压缩与 Transaction Elim) │
└──────────────────┴──────────────────────────────────────────────────────────────┘
```

### 1. Imageblocks（图像块内存）与自定义 G-Buffer

在传统的延迟渲染（Deferred Shading）中，需要在显存中创建包含 Albedo、Normal、Specular 等多个贴图的 G-Buffer。这带来了巨大的 DDR 读写带宽消耗。

Metal 允许开发者将 G-Buffer 直接定义为 **Imageblocks**。整个 G-Buffer 仅存在于片上 SRAM 中，在同一个 Render Pass 内部完成光照计算后即可丢弃，完全不需要写入 DDR 内存。

### 2. Tile Shaders（片上计算着色器）

传统 GPU 架构中，Compute Pass（计算 Pass）与 Render Pass（渲染 Pass）界限分明，相互切换需要做昂贵的 Context Switch 以及 DDR 内存同步。

Apple GPU 允许在 Render Pass 内部直接插入 **Tile Shader**，使其能够直接以 SRAM 级的低延迟读写 Imageblock 中的像素数据，极其适合实现 Tile-Based Lighting、SSAO（屏幕空间环境光遮蔽）及自定义后处理。

### 3. Memoryless Render Targets (`MTLStorageModeMemoryless`)

苹果在 Metal 中专门设计了 `Memoryless` 存储模式：开发者可以分配数百 MB 级别的临时 Render Targets（如深度缓冲区、MSAA 多采样缓冲区、G-Buffer）。操作系统不会为其分配任何真实的物理系统内存（DRAM）。这些缓冲区**仅在 GPU 的 Tile SRAM 内部存在**，渲染完成后立即释放，物理内存占用为 $0$。

### 4. Raster Order Groups (ROGs)

解决片上并发访问的核心机制。当多个线程同时向 Tile Memory 中的同一像素写入数据时，ROGs 提供了硬件级的细粒度线程同步机制，使 Programmable Blending（可编程混合）与 Order-Independent Transparency（OIT，半透明顺序无关渲染）的性能大幅提升。

## 四、 从 Mobile 迈向 Desktop：UMA 与 Dynamic Caching 革命

在跨入 M 系列芯片时代后，Apple GPU 需要面对 3A 级桌面游戏和复杂 3D 渲染器的挑战。苹果为此推出了两项重量级架构变革：

### 1. 统一内存架构（UMA, Unified Memory Architecture）

传统的 PC 架构中，数据需要在 CPU RAM 与 GPU VRAM 之间通过 PCIe 总线进行频繁拷贝（如通过 PCIe 4.0/5.0 总线，带宽仅为 $32 \sim 64\text{ GB/s}$ ）。

Apple Silicon 将 CPU、GPU 和 Neural Engine 集成在同一 SoC 上，共享同一块超高带宽的统一内存（例如 M4 Pro/Max 及后续高端芯片能提供高达 $300 \sim 600+\text{ GB/s}$ 的统一内存带宽）：

- **零拷贝（Zero-Copy）**：CPU 准备的顶点/纹理数据，GPU 可直接访问，没有任何序列化与搬移开销。
- **超大显存开箱即用**：GPU 可以使用高达 128GB 甚至 192GB 的内存池，使得在 Mac 上直接运行超大语言模型（LLM）或极端复杂的 8K 影视渲染成为可能。

### 2. Dynamic Caching 的底层机制与工程演进

在 Apple Family 9（如 M3 / A17 Pro 及后续迭代）中，苹果引入了名为 **Dynamic Caching（动态缓存）** 的硬件级革变（技术源于苹果授权专利 **US11829298B2 / 公开号 US20210271606A1 -** ***On-demand Memory Allocation***）。

### 概念辨析：VGPR 依然静态，真正动态开辟的是 Spill / Scratch Memory

在讨论 Dynamic Caching 时，常见的误解是将其等同于“在硬件指令级别实时动态给线程重分配 VGPR（向量通用寄存器）”。在物理电路实现上，SRAM 寄存器文件的读写端口和物理网络无法承受指令级的实时重构。

**真正的底层机制是：On-Demand Memory Allocation（按需片上私有内存/缓存分配）**。

1. **VGPR 与线程组静态分配**：每个 Shader 在编译和 Dispatch 时，其基础寄存器（VGPR）数量和 Block 尺寸依然是确定的。
2. **Spill Memory（溢出内存）与 Local Scratch 动态开辟**：当复杂 Shader 运行遇到分支、深度递归、Ray Tracing 射线追踪或发生 Register Spill（寄存器溢出到栈）时，传统 GPU 会按照**最坏情况（Worst-Case）预先静态留出一大块物理 Scratch 空间**。这导致大量的片上缓存被空置锁定，极大幅度地下跌了 Occupancy（占有率）。
3. **Dynamic Caching 的突破**：苹果通过硬件 Page Table 分配器与 MMU 联动，实现了在线程组运行过程中，**按需（On-Demand）为 Register Spill 和 Local Thread Scratch 开辟与回收内存**，不再为 Worst-Case 预留空间。

```
传统静态预留 (Static Allocation for Worst-Case Spill):
[ 线程 1 (预留最大 Spill 空间) ] [ 线程 2 (预留最大 Spill 空间) ] ──> 片上缓存大量空置 ──> 占有率 (Occupancy) 低

Dynamic Caching (硬件按需开辟 Spill / Scratch Memory):
[ 线程1(按需Alloc) ][ 线程2 ][ 线程3 ][ 线程4 ][ 线程5 ] ──> 缓存利用率接近 100% ──> 占有率 (Occupancy) 显著提升
```

### 硬件 Latency 痛点与 Second-Generation Dynamic Caching（DC2）演进

第一代 Dynamic Caching 的“按需开辟（On-Demand Allocation）”虽然极大解放了 Occupancy，但并非没有代价：硬件 Allocator 响应、TLB 缺失查找以及地址映射过程会引入**分配延迟（Allocation Latency）**。在极端复杂的 Ray Tracing 或重度寄存器溢出 Shader 中，硬件等待内存分配返回导致的 Pipeline Stalls 可能会削弱 Occupancy 带来的提升。

为此，苹果在后续的新一代 GPU 着色器核心中推行了 **Second-Generation Dynamic Caching（第二代动态缓存, DC2）**：

1. **硬件分配预判（Allocation Prefetching）**：借助前端指令分析提前预测 Spill / Scratch 需求，将内存分配指令重排并重叠（Overlap）到计算指令流中。
2. **分层 Scratch 池化硬件**：在 Tile Memory/L1 层面建立低延迟硬件池，平抑动态映射引入的 Latency 波动。

## 五、 三大移动/微型 GPU 架构横向终极对比

结合本系列的三篇文章，我们将高通 Adreno、Arm Mali/Immortalis 与 Apple Silicon GPU 进行全方位对比：

| 架构维度 | Apple Silicon GPU (AGX) | Qualcomm Adreno 系列 | Arm Mali / Immortalis 系列 |
| --- | --- | --- | --- |
| 渲染模式 | 纯粹 TBDR（搭载 Punch-Through 优化版硬件 ISP HSR） | FlexRender（DR 与 TBDR 动态切换） | Standard TBDR（从 Early-Z / FPK 演进至 FPP 片段预处理） |
| Alpha/透明图元剔除 | 硬件 ISP + PT 旁路（乱序提前算 Mask，完全消除 Alpha 停顿） | LRZ Feedback 与双向 Buffer（A5xx 彻底关闭 -> A6xx Feedback -> A7xx 双向） | Early-Z 退化 / FPK / FPP（早期退化为 Late-Z，演进为 Pass 级预判） |
| 片上缓存控制 | Tile Memory 完全暴露给 API(Imageblocks / Tile Shaders) | GMEM 缓存（隐式/半显式结合，驱动与 Pass 管理） | Tile Buffer（硬件黑盒，配合 AFBC 压缩） |
| 片上内存分配 | Dynamic Caching (Gen 1/2)（针对 Spill / Scratch 的按需开辟与硬件预判） | 静态/预留式 Register / Local Pool 分配 | 静态/预留式 SIMD 资源池 |
| 显存/内存架构 | 极致 UMA（超高带宽，统一零拷贝内存池） | 移动端共享 LPDDR / System Cache | 移动端共享 LPDDR / System Cache |
| 光线追踪实现 | 硬件 RT 单元（针对 BVH 遍历与 Triangle 交集加速） | Ray Acceleration Unit (RAU) | Ray Tracing Unit (RTU) |
| 生态与 API | 极致深度绑定 (Metal API)，无传统历史包袱 | 跨平台（Vulkan, DirectX, OpenCL） | 跨平台（Vulkan, OpenCL） |

## 六、 总结

Apple Silicon GPU 的成功，绝非仅仅依靠先进的半导体制程（如 TSMC 3nm），而是一场**底层硬件架构与上层 API 软件工程的完美联姻**：

1. **硬件层面**：通过极致纯粹的 TBDR 范式、**突破传统 Alpha Test 瓶颈的 Punch-Through 硬件 HSR 机制**，以及 **Dynamic Caching 针对 Spill Memory 的按需开辟与 DC2 硬件预判**，在极低能耗下实现了惊人的 ALU 利用率与带宽节省；
2. **软件层面**：Metal API 完全剥离了传统 Vulkan/OpenGL 为了兼容各种硬件而保留的沉重负担，将 `Imageblocks`、`Tile Shaders` 和 `Memoryless` 直接交到开发者手中，彻底解放了片上 SRAM 的潜能。

正是这种“软硬一体”的绝对控制权，让 Apple Silicon GPU 在移动端到桌面高端算力的演进道路上，展现出了独树一帜的技术壁垒。

## 七、 参考资料与延伸阅读

1. **Apple Inc. Patent (US10074210B1)**: *Punch-through techniques for graphics processing*（iPhone X / A11 Bionic 首代 AGX 核心 Punch-Through 专利）  
   <https://patents.google.com/patent/US10074210B1/en>
2. **Apple Inc. Patent (US11829298B2 / US20210271606A1)**: *On-demand memory allocation for graphics and compute processing* (Dynamic Caching 核心专利)  
   <https://patents.google.com/patent/US11829298B2/en>
3. **Mesa 3D Graphics Library Documentation**: *Low Resolution Z Buffer (LRZ) Hardware & Evolution on Adreno GPUs (A5xx, A6xx & A7xx)*  
   <https://docs.mesa3d.org/drivers/freedreno/hw/lrz.html>
4. **Arm Official Developer Documentation**: *Arm Immortalis-G925 and Mali-G725 Architecture Guide - Fragment Prepass (FPP)*  
   <https://developer.arm.com/documentation/>
5. **Apple Developer Documentation**: *Tailor your apps for Apple GPUs and tile-based deferred rendering*  
   [Tailor your apps for Apple GPUs and tile-based deferred rendering | Apple Developer Documentation](https://developer.apple.com/documentation/metal/tailor-your-apps-for-apple-gpus-and-tile-based-deferred-rendering)
6. **Apple Tech Talks**: *Metal 2 on A11 - Overview & Imageblocks*  
   [Metal 2 on A11 - Overview - Tech Talks - Videos - Apple Developer](https://developer.apple.com/videos/play/tech-talks/602/)
7. **Philip Turner's GitHub Repository**: *Apple GPU Microarchitecture & Metal Benchmarks*  
   <https://github.com/philipturner/metal-benchmarks>
