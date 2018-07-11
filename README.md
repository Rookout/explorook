# Introduction
This electron app is used to expose local client's folders to our webapp (app.rookout.com)  
via a local GraphQL server

There are 3 components to this electron app:  
1. [The main process](#The-main-process)
1. [The react web app](#The-react-web-app)
1. [An invisible worker window](#The-invisible-worker-window)

# Features
1. [![CircleCI](https://circleci.com/gh/Rookout/explorook/tree/master.svg?style=shield)](https://circleci.com/gh/Rookout/explorook/tree/master)
1. Cross platform
1. Secure via Access Token
1. Auto updates
1. Search Indexing

# The main process
Written in ``Typescript``, the main process is used to initialize the windows and communicate with them via electron's built in RPC functionality.  
It helps the windows achieve functionalities they cannot access directly (e.g: desktop notifications, tray icon)

# The react web app
Written in ``ES6``, and uses ``create-react-app``, The react app is the window the client actually sees.  
The window exposes configurations to the clients and stuff like add/delete/edit repositories, exposing the access token (see [Access Token](#The-access-Token))  

# The invisible worker window
The invisible worker window runs the GraphQL server and manages all operations on repositories (CRUD operations and indexing)  
The reason we open an invisible windows (and not use the main process for that) is because the indexing job is cpu heavy and we cannot block the main process, as it blocks renderer processes as well ([reference](https://medium.com/actualbudget/the-horror-of-blocking-electrons-main-process-351bf11a763c))

# The access Token
Because we listen on http://localhost:44512 (which is the graphql endpoint we spin), every website running on the client's machine has access to our API.  
In order to restrict access we use an access token whitout which every call to our API will return ``status 401`` [see auth middleware](https://github.com/Rookout/explorook/blob/22079b3b34d5006e2b19b88ee31883cb8064b1f2/src/server.ts#L15)

# Project initialization
1. run ``yarn`` in ``/src/webapp`` to install webapp dependencies
1. run ``npm install`` in root directory to install electron's dependencies

# Run in development
In development we run the webpack server to serve the react web app. We do this because we get hot reload when we modify the react code.  
To run the webapp server:
1. run ``yarn run start`` in ``/src/webapp`` to run development server
1. run ``npm start`` in the root directory to run the electron app

# Build for production
TODO (see circleci yaml)