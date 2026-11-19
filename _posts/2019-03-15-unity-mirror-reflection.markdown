---
layout: post
title: "在Unity3D中简易实现镜面反射"
date: "2019-03-15 18:55:53 +0800"
author: tachen
original_url: https://zhuanlan.zhihu.com/p/59391004
---

![在Unity3D中简易实现镜面反射]({{ site.baseurl }}/img/posts/2019-03-15-unity-mirror-reflection/v2-7677a57ee0be7583411fcf6cad598192.jpg)

## 基于Cubemap的镜面反射（Mirror Reflection）

![https://developer.arm.com/docs/100140/latest/advanced-graphics-techniques/implementing-reflections-with-a-local-cubemap/history-of-reflection-implementations]({{ site.baseurl }}/img/posts/2019-03-15-unity-mirror-reflection/v2-00fea6e8189ecdbb85cce86aec60f3f3.jpg)
*https://developer.arm.com/docs/100140/latest/advanced-graphics-techniques/implementing-reflections-with-a-local-cubemap/history-of-reflection-implementations*

## 自动设置Reflection Probe位置脚本

```
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[ExecuteInEditMode]
public class PlaneRelection : MonoBehaviour
{
    [SerializeField]
    private Transform ReflectionPlane;

    [SerializeField]
    private ReflectionProbe ReflectionProbe;

    private Transform CacheCamera;

    private void Start()
    {
        CacheCamera = Camera.main.transform;

        Vector3 v = CacheCamera.position - ReflectionPlane.position;
        Vector3 d = Vector3.Project(v, ReflectionPlane.up);

        ReflectionProbe.transform.position = CacheCamera.position - d * 2;
    }
}
```

## 用到的数学知识

![https://docs.unity3d.com/ScriptReference/Vector3.Project.html]({{ site.baseurl }}/img/posts/2019-03-15-unity-mirror-reflection/v2-248441faa097dec152621cde9d4ea423.jpg)
*https://docs.unity3d.com/ScriptReference/Vector3.Project.html*

## 使用案例

![]({{ site.baseurl }}/img/posts/2019-03-15-unity-mirror-reflection/v2-f5416742357a8ca7397e90a1bb4e7ccd.jpg)
