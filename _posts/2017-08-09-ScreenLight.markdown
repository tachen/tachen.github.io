---
layout:     post
title:      "DayDream Render Learn"
subtitle:   "Screen Light"
date:       2017-08-08 00:30:00
author:     "tachen"
header-img: "img/post-ScreenLight-bg-00.png"
---
<h3>什么是Screen Light</h3>
<P>现实中每块屏幕是会自发光的，也就是说屏幕会照亮周围的物体，为了模拟这种效果，可以使用Screen Light</p>

<h3>如何实现Screen Light</h3>
<p>提供三种实现方法：</p>
* 使用Dynamic Reflection Probe，实时采集环境变化，反射到周围物体上（Unity 官方技术支持提供方法）
* 通过Screen Texture计算得到一个平均色，用一个Spot Light照亮（DayDream 提供的方法）
* 通过Screen Texture计算得到一个平均色，用DynamicGI.SetEmissive（目前测试使用的方法）

<p>Dynamic Reflection消耗很大，相当于要实时生成当前环境的CubeMap,
通过Screen Texture计算只需要处理一张Screen Texture，所以消耗小很多
</p>


<h3>测试结果</h3>
<img src="{{ site.baseurl }}/img/post-ScreenLight-bg-01.png" alt="图-0">


<h3 class="section-heading">参考资料</h3>
<a href="https://developers.google.com/vr/unity/media-app-template" target="_blank">Daydream Media App Template</a>









