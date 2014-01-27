Impact-DAG-Render
=================

A quick little project to try out some ideas for rendering Impact DAGs. 

This uses dagre (https://github.com/cpettitt/dagre) for graph layout and D3 (http://d3js.org) for rendering.
It's basically a fork of http://cs.brown.edu/people/jcmace/d3/graph.html?id=small.json

To try it out, run 
```
$ cd Impact-DAG-Render
$ python -m SimpleHTTPServer 
```
Then browse to http://localhost:8000/graph.html?id=svc_model.json

