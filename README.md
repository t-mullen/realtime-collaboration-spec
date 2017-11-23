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

## Public Interfaces
This section specifies public interfaces that **MUST** be available to the extension developer.

### FileIndex
A `FileIndex` instance represents a map of path names to files.

```erlang
[Constructor(String site)]
interface FileIndex {
  File                createFile(String path);
  void                deleteFile(String path);
  void                moveFile(String path, String newPath);
  File                getFile(String path);
  sequence<File>      getFiles();
  
  attribute EventHandler<filecreate>    onFileCreate;
  attribute EventHandler<filedelete>    onFileDelete;
  attribute EventHandler<filemove>      onFileMove;
}
```

#### Constructor
When the `FileIndex()` constructor is invoked, the client **MUST** run the following steps.
1. Store a reference to parameter `site` as `site`.
2. Let `counter` be a `long`, initially set to `0`.
3. Let `map` be a newly created `CRDTMap`.
4. Let `index` be a newly created `record<String, FileIdentifier>`.
5. `map.onAdd` **MUST** create a new `File` instance with 

#### Attributes

#### Methods

### File
A `File` instance represents a sequence of characters and a set of cursors.

```erlang
[Constructor(FileIdentifier identifier)]
interface File {
  String                    getContent();
  String                    getCharAt(long index);
  set<CursorPosition>       getCursors();
  void                      setCursors(sequence<CursorPosition> cursors);
  void                      insert(String string, long position);
  void                      delete(long position, long length);
  void                      replaceRange(String string, long position, long length);
  boolean                   deleted;
  
  attribute EventHandler<change>        onChange;
  attribute EventHandler<cursormove>    onCursorMove;
}
```

### CursorPosition
```erlang
object CursorPosition {
  long    line;
  long    char;
}
```

### FileChangeEvent
```erlang
object FileChangeEvent {
  String                         fileIdentifier;
  sequence<FileChangeInsertAtom> inserts;
  sequence<FileChangeDeleteAtom> deletes;
}
```

### FileChangeInsertAtom
```erlang
object FileChangeInsertAtom {
  long            index;
  String          element;
}
```

### FileChangeDeleteAtom
```erlang
object FileChangeDeleteAtom {
  long    index;
}
```

### CursorMoveEvent
```erlang
object CursorMoveEvent {
  String          fileIdentifier;
  CursorPosition  position;
}
```

## Private Interfaces
This section specifies private interfaces that **SHOULD NOT** be available to the extension developer.

### CRDTMap
```erlang
interface CRDTMap {


}
```

### CRDTSet
```erlang
interface CRDTSet {


}
```

### CRDTSequence
```erlang
interface CRDTSequence {


}
```

### FileIdentifier
```erlang
object  {
  String          site;
  long            counter;
}
```


## Event Summary

### filecreate

### filedelete

### filemove

### change

### cursormove

## CRDT Model
*This section is non-normative.*
*The following are working notes and not part of the specification*
- Sequences nested in a map CRDT, mapping file paths to sequences.
- Map could be implemented using Observe-Remove-Sets, sequences with LSEQ, Logoot, Woot, etc (likely with the Split optimization).
- Sequences support undo.
- Must allow diff-based merging for offline work (consensus protocol?).

## Network Protocol
*This section is non-normative.*
*The following are working notes and not part of the specification*
- Must be available within web-based editors and more traditional IDEs.
- Ideally is peer-to-peer with some fallback (WebRTC and WebSockets fallback?)
- Must allow offline work.
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

