---
slug: full-text-search-inverted-index
title: 67\. Full-text Search (Inverted Index)
type: system-design
category: breakdown
difficulty: medium
askedAt: []
videoUrl: ''
updatedAt: 2026-05-03T00:00:00.000Z
author: Arjun Surendra (gitorko)
focusTag: ''
prerequisites: []
seeAlso: []
originalSource: 'https://gitorko.github.io/post/grokking-the-system-design-interview/'
originalAnchor: '#67-full-text-search-inverted-index'
originalAuthor: Arjun Surendra
importedAt: 2026-05-03T00:00:00.000Z
licenseNote: >-
  Imported with explicit collaboration permission. Site migrating into
  DesignDojo.
---
## 67\. Full-text Search (Inverted Index)

Full-text search enables users to search for specific words or phrases. Full-text search relies on an inverted index, which is a data structure that maps words or phrases to the documents in which they appear. An inverted index is an index data structure storing a mapping from content, such as words/numbers, to its locations in a document or a set of documents eg: Elasticsearch

Two types of inverted indexes

1.  Record-Level: Contains a list of references to documents for each word.
2.  Word-Level: Contains the positions of each word within a document.

**Inverted index** - A data structure used primarily for full-text search. It maps content, such as words or terms, to their locations in a database. Ideal for exact term-based full-text search, mapping terms to documents.

**Trigram Index** - A type of index that helps in performing fast, efficient searches for substring matching and fuzzy matching by breaking down strings into a series of three-character sequences (trigrams). Suitable for approximate and fuzzy matching, indexing trigrams (three-character sequences) for efficient substring search.

![](/post/grokking-the-system-design-interview/inverted-index.png)
