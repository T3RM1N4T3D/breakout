const target = { targetId: 'browser' };

async function start(payload,prefix,open) {
    async function onNetEvent(_,_,event) {

        if (!event.request.url.startsWith(prefix)) {
            await chrome.debugger.sendCommand(target, "Fetch.continueRequest", {
                requestId: event.requestId
            });
            return;
        };

        await chrome.debugger.sendCommand(target, "Fetch.fulfillRequest", {
            requestId: event.requestId,
            responseCode: 200,
            body: btoa(`${payload.toString()}`)
        })
    }
    
    await chrome.debugger.attach(target, '1.3');
    chrome.debugger.onEvent.addListener(onNetEvent);
    await chrome.debugger.sendCommand(target, 'Fetch.enable');

    if (open) {
        await new Promise(res => setTimeout(res, 1000));
        await chrome.debugger.sendCommand(target, 'Target.createTarget', {
            url: open
        })
    }
}

chrome.runtime.onMessage.addListener(async function (msg, sender, respondWith) {
    start(msg.payload,msg.prefix,msg.open);
});