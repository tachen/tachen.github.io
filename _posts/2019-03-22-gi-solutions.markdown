---
layout: post
title: "不同工具提供的Global Illumination解决方案"
date: "2019-03-22 18:09:01 +0800"
author: tachen
original_url: https://zhuanlan.zhihu.com/p/60052665
---

![不同工具提供的Global Illumination解决方案]({{ site.baseurl }}/img/posts/2019-03-22-gi-solutions/v2-7a5863656e2f3d3e3287a4fed3376615.jpg)

## Real Time Global Illumination（实时全局光照）

[Enlighten - Real Time Global Illumination Solution | Silicon Studio](https://www.siliconstudio.co.jp/middleware/enlighten/en/)

### Unreal引擎实现方案

[Lightmass Global Illumination](https://docs.unrealengine.com/en-US/Engine/Rendering/LightingAndShadows/Lightmass)

- 自动生成Lightmap UV
- 使用Unreal Swarm Agent分布计算（可远程、可本地）
- 编辑器视图：[View Modes](https://docs.unrealengine.com/en-us/Engine/UI/LevelEditor/Viewports/ViewModes)

### Unity引擎实现方案

[Global Illumination](https://docs.unity3d.com/Manual/GIIntro.html)

- 自动生成Lightmap UV
- 编辑器视图：[GI visualizations in the Scene view](https://docs.unity3d.com/Manual/GIVis.html)
- Lightmapped Shader Variants：[Rendering 16](https://catlikecoding.com/unity/tutorials/rendering/part-16/)

## Photorealistic 3D Rendering

## Blender实现方案

[Rendering — blender.org](https://www.blender.org/features/rendering/)

- DCC工具
- Node Material Editor
- Open Source：[Cycles · rC](https://developer.blender.org/diffusion/C/)
