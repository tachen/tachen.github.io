---
layout: post
title: "LUT渲染原理实践"
date: "2022-05-05 11:37:19 +0800"
author: tachen
original_url: https://zhuanlan.zhihu.com/p/509505373
---

### 无ColorGrading运行效果

![]({{ site.baseurl }}/img/posts/2022-05-05-lut-rendering/v2-777a9d02740cc0943da830e049a48094.jpg)

### 应用Color Grading运行效果

![]({{ site.baseurl }}/img/posts/2022-05-05-lut-rendering/v2-544f2269d41f4bee1b85e6772450b355.jpg)

### ColorGrading.frag代码

![]({{ site.baseurl }}/img/posts/2022-05-05-lut-rendering/v2-85a20dea34755d5acbe76dc8955493d5.jpg)

**自定义LUT**

![]({{ site.baseurl }}/img/posts/2022-05-05-lut-rendering/v2-adb3fec3999ead15d4487bac54996af1.png)

**代码思路**

首先分析LUT图，是由16*1的大方块组成，再放大一个大方块：

![]({{ site.baseurl }}/img/posts/2022-05-05-lut-rendering/v2-74251af4cb3efa40bdc78665eab89dd9.png)

可以看到没一个大方块是由16*16个像素小块构成，所以物理上课程中使用的LUT是由16*16*16个像素块组成的分辨率为256*16大小的图片。

LUT的原理为像素颜色映射，映射关系为：color.b值对应为大方块的索引(index)，color.rg值对应为每一个大方块中的行列值。

实际计算可以理解为对3维数组的访问，当前计算的framebuffer的color值为3维数字的下标，而3维数组的值就是最终color_grading的值，取到后写入framebuffer输出到屏幕。

![]({{ site.baseurl }}/img/posts/2022-05-05-lut-rendering/v2-5702d5260e5be6f1e41a7ae191061a02.jpg)

**参考链接**

<https://stackoverflow.com/questions/54726995/how-to-use-3d-lookup-table-and-map-its-pixel-value-to-an-image>
