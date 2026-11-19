---
layout: post
title: "基础概念理解"
date: "2019-02-05 13:56:31 +0800"
author: tachen
original_url: https://zhuanlan.zhihu.com/p/55293193
---

![基础概念理解]({{ site.baseurl }}/img/posts/2019-02-05-basics-sdf-raymarching/v2-929c5a1b197aa189b5a6eb3ee90e907b.jpg)

## 表现力来源

![来自Iqilezles Blog]({{ site.baseurl }}/img/posts/2019-02-05-basics-sdf-raymarching/v2-78c39bd4fcb304c690405031d5ef3ac0.jpg)
*来自Iqilezles Blog*

更精确的形状还原

![使用uRaymarching生成]({{ site.baseurl }}/img/posts/2019-02-05-basics-sdf-raymarching/v2-7362786f0f47414c6c6a48414d26c07e.jpg)
*使用uRaymarching生成*

## Signed Distance Function

![]({{ site.baseurl }}/img/posts/2019-02-05-basics-sdf-raymarching/v2-c76e2aad27e59603802b7cd78cdd8f8f.jpg)

## Ray Marching

![参看:Rya Marching and Signed Distance Functions]({{ site.baseurl }}/img/posts/2019-02-05-basics-sdf-raymarching/v2-06dfb5079bde3eaa6c6c57271292e04c.jpg)
*参看:Rya Marching and Signed Distance Functions*

![来自GPU Gems2]({{ site.baseurl }}/img/posts/2019-02-05-basics-sdf-raymarching/v2-cdcc0cceee397fb9c3f43ad33d973649.jpg)
*来自GPU Gems2*

所有Ray Marching的计算都在fragment shader中执行，也就是说是per pixel级别的计算，通过SDF(signed distance function)优化光线计算量，以此达到实时渲染。

## 本地编译ShaderToy代码工具

![本地编译ShaderToy结果]({{ site.baseurl }}/img/posts/2019-02-05-basics-sdf-raymarching/v2-922c8f2790ba07bd5d932d5852170b49.jpg)
*本地编译ShaderToy结果*

注意事项：

![修改shader文件属性]({{ site.baseurl }}/img/posts/2019-02-05-basics-sdf-raymarching/v2-4d07fb5367873bc2e43f00d2fc5e1b08.jpg)
*修改shader文件属性*

## 新年好

## 参考链接

[Iquilezles Blog](https://iquilezles.org/www/articles/raymarchingdf/raymarchingdf.htm)

[GPU Gems2](https://developer.nvidia.com/gpugems/GPUGems2/gpugems2_chapter08.html)

[Rya Marching and Signed Distance Functions](http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/)

[A native shadertoy-compatible GLSL playground in .NET framework Environment](https://github.com/arminkz/ShaderToy.NET)

[uRaymarching](https://github.com/hecomi/uRaymarching)

[How do Raymarch shaders work](https://gamedev.stackexchange.com/questions/67719/how-do-raymarch-shaders-work)

[Raymarching Workshop Course Outline](https://github.com/ajweeks/RaymarchingWorkshop)
