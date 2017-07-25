---
layout:     post
title:      "机试练习"
subtitle:   "给定一个字符串M，对M进行权重排序后得到结果数组S，要求S中所有的字符串的权重比M大，最终输出S中最小权重的字符串"
date:       2017-07-25 15:00:00
author:     "tachen"
header-img: "img/post-MultiverseTestbg-02.jpg"
---

<h2>机试题目练习</h2>

```
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// 给定一个字符串M，对M进行权重排序后得到结果数组S，要求S中所有的字符串的权重比M大，最终输出S中最小权重的字符串
/// 
/// 字符越靠前权重越大，相同位置字符权重大小按英文字母排序a—z，
/// 
/// 例如：
/// 输入：xyz
/// 输出：xzy
/// 
/// 输入：cmga
/// 输出：gacm
/// </summary>

[ExecuteInEditMode]
public class MultiverseTest : MonoBehaviour
{
    public string OriginStr;

    public bool IsSort;

    public struct CharData
    {
        public char value;
        public int index;
        public int order;
    }

    private void Update()
    {
        if (IsSort)
        {
            IsSort = false;

            Sort();
        }
    }

    private void Sort()
    {
        if (string.IsNullOrEmpty(OriginStr)) return;

        CharData[] allData = new CharData[OriginStr.Length];
        int count = allData.Length;
        for (int i = 0; i < count; i++)
        {
            allData[i].value = OriginStr[i];
            allData[i].index = i;
            allData[i].order = i;
        }

        //计算权重
        CharData[] tempAllData = new CharData[count];
        System.Array.Copy(allData, tempAllData, count);
        for (int i = 0; i < count; i++)
            for (int j = i; j < count; j++)
            {
                if ((int)tempAllData[i].value > (int)tempAllData[j].value)
                {
                    CharData tempData = tempAllData[i];
                    tempAllData[i] = tempAllData[j];
                    tempAllData[j] = tempData;
                }
            }

        //权重映射
        for (int i = 0; i < count; i++)
        {
            allData[tempAllData[i].index].order = i;
        }

        //从右到左遍历
        int index = 0;
        bool isBreak = false;
        for (int i = count - 1; i >= 0; i--)
        {
            if (isBreak)
            {
                break;
            }

            for (int j = i; j >= 0; j--)
            {
                if (allData[i].order > allData[j].order)
                {
                    CharData tempData = allData[i];
                    allData[i] = allData[j];
                    allData[j] = tempData;
                    index = j;
                    isBreak = true;
                    break;
                }
            }
        }

        //对剩余字符做权重排序
        for (int i = count - 1; i > index; i--)
            for (int j = i; j > index; j--)
            {
                if (allData[i].order < allData[j].order)
                {
                    CharData tempData = allData[i];
                    allData[i] = allData[j];
                    allData[j] = tempData;
                }
            }

        //输出结果
        System.Text.StringBuilder combine = new System.Text.StringBuilder();
        for (int i = 0; i < count; i++)
        {
            combine.Append(allData[i].value);
        }

        Debug.Log(combine.ToString());
    }
}

```

<p>优化只需要更换排序算法就行</p>








