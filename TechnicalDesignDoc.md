# Treetop - Technical Design Doc

Treetop is a server-hosted program that a user runs to help them self-host app. The goal of the project
is to make it dead-simple for the average person to run their own servers.

Installing new servers and managing servers should be easy and fun. This is an app targeted more at hobbyists and
tinkerers than at software engineers, corporations, or IT professionals. Everything should be designed to be
fun and easy, with simple interfaces that hide as much technical details as possible.

A reasonably curious, computer-literate person should be able to get up-and-running with treetop and have fun.

# Technical Specs

## The app-runner

The app itself (aka treetop, aka the "app runner") will be a node.js app that will be launched with systemd. It will eventually be installed by the user, on Linux, using `apt` or similar tools. Let's defer those details for later though. For now, we just want to get the basics working.

The app itself will listen using express-js to serve an admin interface for the user to manage their servers, install new servers, etc.

The user "installs" the server by typing the URL of server files (like with a web-browser). All "servers" are provided by external users, in this way. By analogy, treetop is like a browser for server-side apps. It is critical that the servers
provided by users are tightly sandboxed.

## Running servers (aka apps) 

When a server is "installed", the main node.js process should launch a docker container (using docker CLI). The container should run a "setup" entrypoint that downloads the app files from the URL then runs them.

There are two cases that we want to support:
A: The URL points to a JS file. We run this JS file using node.js, within the container (with locked-down settings).
B: The URL points to a docker image. We run this docker image (but with locked-down settings).

## App networking

First, we need some way for the user to route HTTP traffic to the app.

Let's say the user's server is at mriley.com, and they've installed apps Foo and Bar.

I think we want to route internet traffic basic on:
- foo.mriley.com => foo container
- bar.mriley.com => bar container

Details:
Need to use some reverse proxy (nginx, traefik, etc) to dynamically route the traffic as apps are added and removed.
Probably use traefik. I hear it is good for this.

The user will need to setup their server with a wildcard cert, and probs some other things. Pref make a tool, image, etc to 
make this very simple for people. Ideally, even host the servers for them.

The system should also use certbot or similar to automatically setup a TLS cert for each installed app.

Eventually:
Eventually, it would be cool to allow the user to install apps that directly exposes TCP or UDP ports, for advanced networking.

To support this, the app must asks for some explicit permissions.

## App APIs & App Permissions

So, what APIs can an app actually use (aka the equivalent of Browser APIs)?

Ideally, there aren't really any special APIs. The app can go crazy within the container (store files, etc)
and bad stuff should be prevented by the containerized security rules (memory, disk usage, networking, etc).

Each app should have a manifest that describes the permissions:

- If needs more memory or disk than default, must request.
- All outbound networking activity must be listed (by default none is allowed)

Later on:
- Perhaps later on, some APIs can be provided, but for now the container sandbox should be sufficient for most apps.

## App versions and updating

Apps will update automatically, like browser websites do, to prevent the user having to worry about this. The app controller
will check for updates periodically on all installed apps and retrigger updates if one is ready.

- Maybe it queues it until the user explicitly requests it.
- Ideally configurable in the app mgmt console (but automatic, at 3am local time by default)

# UI Specs

## Homepage:

- Install apps - see a URL bar for typing in the address

- View currently installed apps
-- Clicking one takes you to management page

- App catalog
-- See a URL bar where you can type in the address of a server-side app.

- View any warnings, errors, etc.

## App management page

- Clicking an app takes you to its management page

- Actions:
-- Start/stop (starts/stops without affecting data or anything)
-- Uninstall (can choose to keep data or not)
-- Setup update strategy
--- Automatic at 3am (default), or only with manual approval
-- Force check for updates & install

-- See server admin info
--- See logs (esp warnings and errors)
--- See access log
--- See simple CPU, memory, and disk usage

-- File-viewer to see all data:
--- It is your data, after all.
--- In-browser file-viewer where you can: view, download, upload, create, or delete files

-- App-specific settings file?
--- Eh, preferably not. Each app should have a server where the user can go to configure the app in
some way that the app deems fit. This is I think more flexible than having some weird mechanism
for the user to set user settings through the admin interface using an iframe, schema-based editor,
or something.

# Other Features

## Live development

Would be cool if had some helper utilites for live development (to start, just with typescript servers).
- Setup with the AI integration. Would be cool. Could have different starter containers for different
languages, too.
- Pref could edit in-browser or edit locally and have it auto-sync to your server.
- Ability to download + remix other people's stuff
- Client app should also have auto-load as you develop

## Backup, import, export, and copy

Should probably have a decent story here. Especially for backup.
- Since containerized, should be very easy, ideally.

## Flexible download sources

Typical source should just be JS by URL, but should also support torrent distribution of
apps.

# Anything else?

Idk, that sounds like it might be it :)

I'm sure there are way more details, but I think that is a good start. Let's keep things very simple and
make it fun and easy for users to 

## Developer docs

The dev experience should be fantastic, too.

# Ideas

Some possible advanced features, for later on.

## AI integration:

An app should be able to request the user's AI interface (using OpenRouter API, or something). The app-controller stores the actual token, and the app must use the permission system to enable + request usage.

This is a way for apps to call the user's AI agent, at cost. User can enforce strict token limits, preload it, etc.

## Client-side browser

One issue here is that even if I have 10 cool apps, it is not easy to run the client-side interface for all of them because
all current browsers have sandbagged PWA progress.

Ideally, we should make our own browser-like app that trivially allows you launch PWAs. Ideally with built-in support for your treetop instance.

## Treetop hardware

Ideally, ideally, we would create+sell hardware to allow users to run their servers easily on devices that they own.
- Then, no need to pay a subscription to The Man. Simply buy a hardware device and expose it through your home network
(which you already pay for).

## Client hardware (phone)

Ideally, ideally, we would even create a new phone OS to be able to run PWAs as first-class citizens :)
