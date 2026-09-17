// content-gov.js (SGL Sniffer Mode)
console.log("🚀 SGL Sniffer: Assistente de interceptação carregado.");

// Inject interceptor script into the main world
const script = document.createElement('script');
script.textContent = `
(function() {
    console.log("🚀 SGL Sniffer: Interceptador Injetado no Main World.");
    
    // Intercept Fetch
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
            const clone = response.clone();
            const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
            
            // Only care about API endpoints
            if (url && (url.includes('api') || url.includes('acompanhamento'))) {
                clone.json().then(body => {
                    window.postMessage({
                        type: 'SGL_API_INTERCEPT',
                        payload: { url, body }
                    }, '*');
                }).catch(e => {});
            }
        } catch (e) { }
        return response;
    };
    
    // Intercept XHR
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url) {
        this._sglUrl = url;
        return originalXhrOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function() {
        this.addEventListener('load', function() {
            try {
                if (this._sglUrl && (this._sglUrl.includes('api') || this._sglUrl.includes('acompanhamento'))) {
                    const body = JSON.parse(this.responseText);
                    window.postMessage({
                        type: 'SGL_API_INTERCEPT',
                        payload: { url: this._sglUrl, body }
                    }, '*');
                }
            } catch (e) { }
        });
        return originalXhrSend.apply(this, arguments);
    };
})();
`;
(document.head || document.documentElement).appendChild(script);

// Listen for messages from the injected script and send them to the backend
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SGL_API_INTERCEPT') {
        const payload = event.data.payload;
        console.log("🚀 SGL Sniffer: Interceptou chamada para", payload.url);
        
        fetch('http://localhost:7005/compras-gov-monitor/sniff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => {
            console.error("🚀 SGL Sniffer: Erro ao enviar para o backend", err);
        });
    }
});
