---
layout:     post
title:      "Technical Artist Learning Bookmark：PBR"
subtitle:   "转职技术美术学习笔记第一卷：Physically based rendering学习目录"
date:       2017-09-04 15:30:00
author:     "tachen"
header-img: "img/post-PBR-bg-00.png"
---
<h2>前言</h2>
<p>这里只有PBR学习需要的目录部分</p>

<h2>什么是 Physically based rendering</h2>
<p>
计算机图形学一直以来都在研究如何模拟现实世界中光线与各种物体表面交互的结果，为了得到真实感很强的画面，离线渲染使用Ray tracing等全局光照技术，而在游戏相关的实时渲染领域，一直以来都是使用简化的光照模型[1]和静态全局光照[2]，而如何在游戏等实时渲染领域实现更加真实的效果一直都有很多学术研究，近几年的siggraph会议上提出的Physically based rendering就是其中一个方法。
</p>

<h2>如何实现 PBR [5]</h2>
<h3>Shading Model</h3>
<p>Shader要实现两个部分：BRDF和Image-based Lighting</p>

<p>BRDF: <br />
BRDF决定了Rendering是否Physically base，即能量是否守恒。<br />
具体来说BRDF是指Specular BRDF[3]，如何在Unity
中自己实现Specular BRDF，可以看参考[4]</p>

<p>Specular BRDF包含三个部分：
<ul>
<li>The Normal Distribution Function (Specular Function)</li>
<li>The Geometric Shadowing Function</li>
<li>The Fresnel Function</li>
</ul>
</p>

<p>Image-based lighting包含两部分[6]:
<ul>
<li>CubeMap mips </li>
<li>2d Loookup Texture(LUT)</li>
</ul>
这部分和Lightmap一样，需要做预处理，也就是说要Baked
</p>

<h3>Material Model</h3>
<p>The specular value chart:</p>
<img src="{{ site.baseurl }}/img/post-PBR-bg-01.png" alt="图-0">

<p>The metallic value chart:</p>
<img src="{{ site.baseurl }}/img/post-PBR-bg-02.png" alt="图-1">

<h3 class="section-heading">参考资料</h3>
<a href="https://en.wikipedia.org/wiki/Phong_shading" target="_blank">1: Phong shading</a>
<br />
<br />
<a href="https://en.wikipedia.org/wiki/Lightmap" target="_blank">2: Lightmap</a>
<br />
<br />
<a href="https://blogs.unity3d.com/cn/2016/01/25/ggx-in-unity-5-3/" target="_blank">3: GGX in Unity 5.3</a>
<br />
<br />
<a href="http://www.jordanstevenstechart.com/physically-based-rendering" target="_blank">4: Physically Based Rendering Algorithms:
A Comprehensive Study In Unity3D</a>
<br />
<br />
<a href="https://docs.unrealengine.com/latest/INT/Engine/Rendering/Materials/PhysicallyBased/" target="_blank">5: Physically Based Materials</a>
<br />
<br />
<a href="https://learnopengl.com/#!PBR/IBL/Diffuse-irradiance" target="_blank">6: Diffuse irradiance</a>
<br />
<br />
<a href="https://blogs.unity3d.com/cn/2015/02/18/working-with-physically-based-shading-a-practical-approach/" target="_blank">7: Working with Physically-Based Shading: a Practical Approach</a>
<br />
<br />
<a href="https://learnopengl.com/#!PBR/Theory" target="_blank">8: PBR Theory</a>
