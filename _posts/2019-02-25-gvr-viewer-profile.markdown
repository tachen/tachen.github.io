---
layout: post
title: "Switch GVR Viewer Profile Without VPN"
date: "2019-02-25 18:16:37 +0800"
author: tachen
original_url: https://zhuanlan.zhihu.com/p/57647211
---

![Switch GVR Viewer Profile Without VPN]({{ site.baseurl }}/img/posts/2019-02-25-gvr-viewer-profile/v2-69d11423c7b377dce14fefcbf88ecc4a.jpg)

## cmd：with out vpn

----------------------------------------------------------------

adb shell

mkdir sdcard/Cardboard

exit

adb push [DeviceP*rofilePath*] sdcard/Cardboard/current_device_params

----------------------------------------------------------------------

## Need Vpn：

## Google VR QRCode Generator

[Cardboard viewer profile generator](https://wwgc.firebaseapp.com/)

## Viewer parameters

[Sites in VR - Viewer Settings](http://www.sitesinvr.com/viewer/settings.htm)

## Google Cardboard1.9 Download

<https://play.google.com/store/apps/details?id=com.google.samples.apps.cardboarddemo&hl=en_US>
