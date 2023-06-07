// Listener for messages from the background script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "loadUrl") {
    loadUrl(message.url);
    sendResponse({ status: "success" });
  }
});

// Function to load the received URL
function loadUrl(url) {
  console.log("URL received in content script: " + url);
  // Perform actions with the URL in the content script
  // For example, you can redirect the current page to the received URL:
  window.location.href = "https://" + url;
}
