---
slug: composite-pattern
title: Composite Pattern
type: low-level-design
category: design-patterns
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/design-patterns/'
originalAnchor: '#2-composite-pattern'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## Composite Pattern

Composite pattern is used when we have to represent a part-whole hierarchy.A group of objects should behave in a similar way,tree like structure. Here we have a playlist which can contain songs or other playlist and those playlist can have songs of their own.

![](https://gitorko.github.io/post/design-patterns/composite-pattern-visual.png)

```java
 1package com.demo.basics.designpatterns._07_composite;
 2
 3import java.util.ArrayList;
 4import java.util.List;
 5
 6import lombok.AllArgsConstructor;
 7import lombok.RequiredArgsConstructor;
 8import org.junit.jupiter.api.Test;
 9
10/**
11 * When the group of objects should behave as the single object
12 */
13public class CompositePatternTest {
14
15    @Test
16    public void test() {
17        SongComponent playList1 = new PlayList("playlist_1");
18        SongComponent playList2 = new PlayList("playlist_2");
19        SongComponent playList3 = new PlayList("playlist_3");
20
21        playList1.add(new Song("Song1"));
22        playList2.add(new Song("Song2"));
23        playList2.add(new Song("Song3"));
24        playList3.add(playList1);
25        playList3.add(playList2);
26        playList3.add(new Song("Song4"));
27        playList3.displaySongInfo();
28    }
29}
30
31abstract class SongComponent {
32
33    public void add(SongComponent c) {
34        throw new UnsupportedOperationException();
35    }
36
37    public String getSong() {
38        throw new UnsupportedOperationException();
39    }
40
41    public void displaySongInfo() {
42        throw new UnsupportedOperationException();
43    }
44}
45
46@RequiredArgsConstructor
47class PlayList extends SongComponent {
48
49    final String playListName;
50    List<SongComponent> componentLst = new ArrayList<>();
51
52    @Override
53    public void add(SongComponent c) {
54        componentLst.add(c);
55    }
56
57    @Override
58    public void displaySongInfo() {
59        System.out.println("Playlist Name: " + playListName);
60        for (SongComponent s : componentLst) {
61            s.displaySongInfo();
62        }
63    }
64}
65
66@AllArgsConstructor
67class Song extends SongComponent {
68    String songName;
69
70    @Override
71    public String getSong() {
72        return songName;
73    }
74
75    @Override
76    public void displaySongInfo() {
77        System.out.println("Song: " + songName);
78    }
79}
```
