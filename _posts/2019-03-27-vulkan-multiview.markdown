---
layout: post
title: "编译Vulkan Multiview Rendering示例工程"
date: "2019-03-27 19:09:46 +0800"
author: tachen
original_url: https://zhuanlan.zhihu.com/p/60594870
---

![编译Vulkan Multiview Rendering示例工程]({{ site.baseurl }}/img/posts/2019-03-27-vulkan-multiview/v2-efb383b4bd618271ed1a6c189d8cfd8c.png)

## 开发环境准备：

Win10 System

Visual Studio 2017 install C++

CMake

git

## 示例工程地址：

<https://github.com/SaschaWillems/Vulkan>

```
cmake -G "Visual Studio 15 2017 Win64"
```

## Vulkan Pipeline

![]({{ site.baseurl }}/img/posts/2019-03-27-vulkan-multiview/v2-05ad9d6d2f5d27104068d1bae834d10a.jpg)

## Compute Left And Right Eye's Matrixs

[Calculating Stereo Pairs](http://paulbourke.net/stereographics/stereorender/)

## Multiview Rendering Pipeline

```
void prepare()
{
	loadAssets();
	prepareMultiview();
	prepareUniformBuffers();
	prepareDescriptors();
	preparePipelines();
	buildCommandBuffers();
}
```

## Example Result

![]({{ site.baseurl }}/img/posts/2019-03-27-vulkan-multiview/v2-7e19585718eecd7bd4e6f84d932ffad0.jpg)

## 一些差异点

### aiScene

.dae文件：包含场景所需的所有信息

![]({{ site.baseurl }}/img/posts/2019-03-27-vulkan-multiview/v2-4c71bec4ab27e203d54b42906714f850.jpg)

<https://www.khronos.org/files/collada_reference_card_1_4.pdf>

### 对开发流程的思考

美术可以将Blender中所有信息导入到支持.dae文件格式的工具中

![]({{ site.baseurl }}/img/posts/2019-03-27-vulkan-multiview/v2-32bb9f00470b792a2b2f1bc3eee30d1f.jpg)

![]({{ site.baseurl }}/img/posts/2019-03-27-vulkan-multiview/v2-77eedeb7f650a5c1a47d7dd466fe1549.jpg)
