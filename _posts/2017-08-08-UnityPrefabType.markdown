---
layout:     post
title:      "Unity PrefabType"
subtitle:   "ModelPrefab和Prefab有什么区别"
date:       2017-08-07 12:00:00
author:     "tachen"
header-img: "img/post-PrefabType-bg-00.jpg"
---

<h3 class="section-heading">如何获得PrefabType</h3>
```
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;

[ExecuteInEditMode]
public class PrefabTypeTest : MonoBehaviour
{
    public GameObject TestPrefab;

    public bool DoTest = false;

    void GetPrefabType()
    {
        DoTest = false;

        PrefabType prefabType = PrefabUtility.GetPrefabType(TestPrefab);
        Debug.Log(prefabType.ToString());
    }

    void Update()
    {
        if (DoTest)
        {
            GetPrefabType();
        }
    }
}

```

<h3 class="section-heading">PrefabType有哪些</h3>
* None
* Prefab
* ModelPrefab
* PrefabInstance
* ModelPrefabInstance
* MissingPrefabInstance
* DisconnectedPrefabInstance
* DisconnectedModelPrefabInstance

<br />

|--|--|
|None|表示对象不是Prefab|
|Prefab|表示对象是自己制作的Prefab|
|ModelPrefab|表示对象是一个外部导入的FBX或者OBJ文件|
|PrefabInstance|表示对象是一个Prefab的实例|
|ModelPrefabInstance|表示对象是一个FPX或OBJ的实例|
|MissingPrefabInstance|表示对象的Prefab引用丢失（一般出现在Prefab被删除但PrefabInstance并未DisConnected）|
|DisconnectedPrefabInstance|表示对象是与Prefab断开链接的，意味着Prefab修改不会应用到该对象上|
|DisconnectedModelPrefabInstance|表示对象是与ModelPrefab断开链接的|

<p>需要注意：Prefab Instance会有自己独有的数据，Prefab的修改也只会修改Connected PrefabInstance的共享数据部分</p>

<h3>ModelPrefab与Prefab有什么区别</h3>

<img src="{{ site.baseurl }}/img/post-PrefabType-bg-01.png" alt="图-0">

<img src="{{ site.baseurl }}/img/post-PrefabType-bg-02.png" alt="图-0">

<img src="{{ site.baseurl }}/img/post-PrefabType-bg-03.png" alt="图-0">

<p>ModelPrefab其实还是一个FBX文件，只不过Unity Editor让它可视化了，但FBX文件中并没有引用关系，这样的结果就是资源无法复用。</p>

<h3 class="section-heading">PrefabType可以用来做什么</h3>
* 比如资源规范：不能直接使用ModelPrefab。那么就可以通过PrefabType检查出来

<h3 class="section-heading">参考资料</h3>
<a href="https://docs.unity3d.com/ScriptReference/PrefabType.html" target="_blank">PrefabType</a>
<br />
<br />
<a href="http://www.xuanyusong.com/archives/2173" target="_blank">Unity3D研究院之预设的使用细节（五十一）</a>
<br />
<br />
<a href="http://forum.china.unity3d.com/thread-1046-1-1.html" target="_blank">Unity3D中的prefab与单纯复制物体有何区别</a>









