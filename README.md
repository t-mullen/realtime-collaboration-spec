# Realtime Collaboration for Programming
## Working Draft

### Editors:
Thomas Mullen

## Abstract
This document defines a set of APIs for implementing code editor extensions that enable realtime collaboration between programmers (also known as pair-programming). The document is intended to standardize future implentations of these software and ensure implementations are cross-compatible, performant and feature-rich.

This specification is **NOT** feature complete and is expected to be change significantly. Members of the community are highly encouraged to contribute to this document.

A future test suite will be used to build an implemen  tation report of the API.

## Table of contents
1. [Introduction](#introduction) 
2. [Conformance](#conformance) 
3. [Terminology](#terminology) 
4. [Public Interfaces](#public-interfaces) 
5. [Private Interfaces](#private-interfaces) 
6. [Event Summary](#event-summary)
7. [CRDT Model](#crdt-model)
8. [Network Protocol](#network-protocol)
9. [Overlay Protocol](#overlay-protocol)
10. [Integration Recommendations](#integration-suggestions)

## Introduction
There are a number of facets to programmer-oriented realtime collaboration that are covered by this specification:
- Storing collaborative data in a way that is eventually consistent (by use of CRDTs).
- Connecting and sending data through widely-available network transports.
- Ensuring sent messages preserve casuality (a requirement of CRDTs).
- Allowing extensibility of the protocol to permit arbitrary data to be replicated.

This document defines the APIs used for these features.

## Conformance

## Terminology
The term **CRDT** is an acronym for Conflict-Free Replicated Data Type.

**JSONParse** refers to any standards-compliant JSON parsing algorithm.

**JSONSerialize** refers to any standards-compliant JSON serializing algorithm.


## Public Interfaces
This section specifies public interfaces that **MUST** be available to the extension developer.

### FileIndex
A `FileIndex` instance represents a map of path names to files.

```erlang
[Constructor()]
interface FileIndex {
  File                createFile(String path);
  void                removeFile(String path);
  void                moveFile(String path, String newPath);
  File                getFile(String path);
  sequence<File>      getFiles();
  
  attribute EventHandler<FileCreateEvent>   onFileCreate;
  attribute EventHandler<FileRemoveEvent>   onFileRemove;
  attribute EventHandler<FileMoveEvent>     onFileMove;
}
```

#### Constructor
When the `FileIndex()` constructor is invoked, the client **MUST** run the following algorithm.

```
UniqueIdentifier site = UniqueIdentifier();
CRDTMap map = CRDTMap(site);
record<UniqueIdentifier, CRDTFile> files = record<UniqueIdentifier, CRDTFile>();

map.onSet = function (e) {
  String path = e.key
  String fileId = e.value
  if (files[fileId]) {
    emit(FileMoveEvent)
  } else {
    files[fileId] = File(fileId)
    emit(FileCreateEvent)
  }
}

map.onRemove = function (e) {
  String path = e.key
  String fileId = e.value
  delete files[fileId]
  emit(FileRemoveEvent)
}
```

#### Methods

### File
A `File` instance represents a sequence of characters and a set of cursors.

```erlang
[Constructor(UniqueIdentifier identifier)]
interface File {
  String                    getContent();
  String                    getCharAt(long index);
  set<CursorPosition>       getCursors();
  void                      setCursors(sequence<CursorPosition> cursors);
  void                      insert(String string, long position);
  void                      remove(long position, long length);
  void                      replaceRange(String string, long position, long length);
  boolean                   removed;
  
  attribute String        path;
  attribute EventHandler<ChangeEvent>     onChange;
  attribute EventHandler<CursorMoveEvent> onCursorMove;
}
```

## Private Interfaces
This section specifies private interfaces that **SHOULD NOT** be available to the extension developer.

### CRDTMap
A replicatable `Map` data type.

```erlang
[Constructor(UniqueIdentifier identifier)]
interface CRDTMap {
  void    set(String key, String value);
  void    remove(String key); 
  String  get(String key);
  String  contains(String key);
  long    length();
  set<String>     keys();
  set<String>     values();
  
  attribute EventHandler<CRDTMapSetEvent>        onSet;
  attribute EventHandler<CRDTMapRemoveEvent>     onRemove;
}
```

### CRDTSet
A replicatable `Set` data type. Similar to `CRDTMap` but without values assigned to the keys.

```erlang
[Constructor(UniqueIdentifier identifier)]
interface CRDTSet {
  void    add(String key);
  void    remove(String key);
  String  contains(String key);
  String  keys();
  long    size();
  
  attribute EventHandler<CRDTSetAddEvent>        onAdd;
  attribute EventHandler<CRDTSetRemoveEvent>     onRemove;
}
```

### CRDTSequence
```erlang
[Constructor(UniqueIdentifier identifier)]
interface CRDTSequence {
  void    insert(long index, String value);
  void    remove(long index);
  long    length();
  String  content();
  
  attribute EventHandler<CRDTSequenceInsertEvent>     onInsert;
  attribute EventHandler<CRDTSequenceRemoveEvent>     onRemove;
}
```

### UniqueIdentifier
```erlang
interface  {
  int   compare(UniqueIdentifier otherIdentifier);
}
```

## Event Summary

### FileCreateEvent
```erlang
object {
  String  newPath;
  File    file;
}
```

### FileRemoveEvent
```erlang
object {
  String  oldPath;
  File    file;
}
```

### FileMoveEvent
```erlang
object {
  String  oldPath;
  String  newPath;
  File    file;
}
```

### ChangeEvent
```erlang
object ChangeEvent {
  String                     path;
  sequence<ChangeInsertAtom> inserts;
  sequence<ChangeRemoveAtom> removes;
}
```

### ChangeInsertAtom
```erlang
object ChangeInsertAtom {
  long            index;
  String          element;
}
```

### ChangeRemoveAtom
```erlang
object ChangeRemoveAtom {
  long    index;
}
```

### CursorMoveEvent
```erlang
object CursorMoveEvent {
  CursorPosition  position;
}
```

### CursorPosition
```erlang
object CursorPosition {
  long    line;
  long    char;
}
```

### CRDTMapSetEvent
```erlang
object {
  String  key
  String  value
}
```

### CRDTMapRemoveEvent
```erlang
object {
  String  key
  String  value
}
```

### CRDTSequenceInsertEvent
```erlang
object {
  String  index
  String  value
}
```

### CRDTSequenceRemoveEvent
```erlang
object {
  String  index
  String  value
}
```


## CRDT Model
*This section is non-normative.*

### CRDTMap
The replicatable Map type is implemented using a Observed-Remove Set and a non-replicated dictionary of sets. The keys for the dictionary are the keys for the external map, the values for the dictionary are arrays of pairs of values and UUIDs and the elements for the OR-Set are tuples of Key, Value, UUID. While this seems complex, this is a very efficient replicated map that makes use of a set type:

```
CRDTSet {
  ORSet<Element<Key,Value,UUID>> set
  record<Key, Array<Pair<Value, UUID>>> dictionary
}
```

The dictionary allows use to translate external keys to unique "key-value-UUID" elements for the set.

To lookup a value on the map, we simply need to iterate through the array of pairs for the given key and return the value paired with the highest UUID.

To add or set a value on the map, we iterate through any existing pairs and remove them from the set by translating them into elements. Then the dictionary is updated and a new element is created and added to the set.

Removing is the same as adding/setting without the last step.

## Network Protocol
*This section is non-normative.*

*The following are working notes and not part of the specification*
- TCP Websockets first, negotiate alternate transports after.

- Alternate transports:
- Must preserve the order messages are sent in (at least between two peers).
- Must guarantee delivery.

## Overlay Protocol
*This section is non-normative.*

*The following are working notes and not part of the specification*
- Must preserve causality (as CRDTs assume this)
- Must guarantee eventual connectivity (the graph of peers is connected)
- Must be robust (graph must be able to reconnect)

## Integration Recommendations
*This section is non-normative.*

*The following are working notes and not part of the specification*
- Non-normative suggestions for how to implement editor extensions
- "View extension" vs "Sync extension". View extensions only modify files within one "master" peer's workspace and don't persist code on the other peers' filesystems (eg Teletype, VSCode Live Share). Sync extensions modify files on all peers, and no peer has a unique role (eg Multihack, server-based solutions like CoVim). Either one should be possible to implement, as this specification will not assume anything about the filesystem. 

## Privacy And Security Considerations
*This section is non-normative.*

## Acknowledgements
*This section is informative.*
Formatting of this document is heavily influenced by W3 Candidate Recommendation documents, especially [WebRTC 1.0: Real-time Communication Between Browsers](https://www.w3.org/TR/webrtc).

## References

