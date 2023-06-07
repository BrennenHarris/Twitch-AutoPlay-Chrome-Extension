var streamURLS = [];
var count = 0;
var loadedURL = ""; //Current URL
var isChecking = false; // Flag to track if live check is in progress
var waitTime = 1000;
var originalWindow = -1;
var currentUserAccessToken;

chrome.storage.local.get(["myList"], function (result) {
  var myList = result.myList || [];
  streamURLS = myList;
  // Use the list in your background script as needed
});

async function setUsersAPI() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(["api"], function (result) {
      const userApi = result.api;
      if (userApi) {
        currentUserAccessToken = userApi;
        resolve(currentUserAccessToken);
      } else {
        getUserAPI()
          .then((accessToken) => resolve(accessToken))
          .catch((error) => reject(error));
      }
    });
  });
}

async function getUserAPI() {
  const apiURL =
    "https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=qk5a5h8f77uhovcwlojxmlk9h2cdmp&redirect_uri=https://www.twitch.tv/&scope=user%3Aread%3Afollows&state=shootlikekd35";

  chrome.tabs.create({ url: apiURL }, function (tab) {
    const tabId = tab.id;
    chrome.tabs.sendMessage(
      tabId,
      { action: "loadUrl", url: apiURL },
      function (response) {
        //console.log(response.status);
      }
    );
  });
}

function saveAccessToken(accessToken) {
  chrome.storage.sync.set({ api: accessToken }, function () {});
}

async function startLiveCheck() {
  if (isChecking) {
    stopLiveCheck();
  }

  loadedURL = "No Stream Found Yet";
  isChecking = true;
  await setUsersAPI();
  liveCheck(); // Initial check
  intervalId = setInterval(liveCheck, waitTime); // Check every 5 seconds
}

function stopLiveCheck() {
  isChecking = false;
  count = 0;
  loadedURL = "No Stream Found Yet";
  clearInterval(intervalId); // Clear the interval
}

async function liveCheck() {
  if (!isChecking) {
    return; // Stop live check if flag is false
  }
  if (count >= streamURLS.length) {
    count = 0;
  }

  chrome.runtime.sendMessage({
    action: "changePlayingIMG",
    changing: true,
    currentURL: loadedURL,
  });

  const isStreamLive = await isLive(streamURLS[count]);

  if (isStreamLive) {
    console.log("loading " + streamURLS[count]);
    loadURL(streamURLS[count]);
  } else {
    clearInterval(intervalId); // Clear the interval
    intervalId = setInterval(liveCheck, 1000); // Set a higher interval (20000 ms) for the next check
    count++;
    console.log("Now checking " + streamURLS[count]);
  }
}

async function isLive(arrayURL) {
  // Extract the channel name from the URL
  const channelName = arrayURL.replace("twitch.tv/", "");
  try {
    // Make a request to the Twitch API to check if the channel is live
    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${channelName}`,
      {
        headers: {
          "Client-ID": "qk5a5h8f77uhovcwlojxmlk9h2cdmp",
          Authorization: "Bearer " + currentUserAccessToken,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const liveStreams = data.data;
      console.log("Stream is ONLINE");
      return liveStreams.length > 0; // Return true if there are live streams for the channel
    } else if (response.status == "401" && count != 0) {
      isChecking = false;
      getUserAPI();
    } else {
      console.log("Stream is Offline");
      return false;
    }
  } catch (error) {
    console.error("API Error");
    getUserAPI();
    return false;
  }
}
async function loadURL(arrayURL) {
  if (loadedURL === arrayURL) {
    count = 0;
    clearInterval(intervalId); // Clear the interval
    intervalId = setInterval(liveCheck, 20000); // Set a higher interval (20000 ms) for the next check
    return;
  }
  loadedURL = arrayURL;

  // Send message to content script with the URL to load
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    chrome.tabs.update(activeTab.id, { url: `https://${arrayURL}` });
  });

  clearInterval(intervalId); // Clear the interval
  intervalId = setInterval(liveCheck, 5000); // Set a higher interval (20000 ms) for the next check
  count = 0;
}

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function startFollowerList() {
  streamURLS = await getFollowerList();
  chrome.runtime.sendMessage({
    action: "followersList",
    followers: streamURLS,
  });
  startLiveCheck();
}

async function getFollowerList() {
  try {
    const streamerId = await getStreamerID();
    const followers = [];

    const response = await fetch(
      `https://api.twitch.tv/helix/channels/followed?user_id=${streamerId}&first=100`,
      {
        headers: {
          "Client-ID": "qk5a5h8f77uhovcwlojxmlk9h2cdmp",
          Authorization: "Bearer " + currentUserAccessToken,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const pageFollowers = data.data.map(
        (entry) => "twitch.tv/" + entry.broadcaster_login
      );
      followers.push(...pageFollowers);
    } else {
      throw new Error("Failed to fetch user list");
    }

    return followers;
  } catch (error) {
    console.error(error);
    return [];
  }
}

async function getStreamerID() {
  await setUsersAPI();
  try {
    const response = await fetch("https://api.twitch.tv/helix/users", {
      headers: {
        "Client-ID": "qk5a5h8f77uhovcwlojxmlk9h2cdmp",
        Authorization: "Bearer " + currentUserAccessToken,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const streamerId = data.data[0].id;
      return streamerId;
    } else {
      throw new Error("Failed to fetch streamer ID");
    }
  } catch (error) {
    console.error(error);
    return null;
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url && tab.active) {
    // URL of the active tab has changed
    console.log("New URL:", changeInfo.url);
    const url = new URL(changeInfo.url);
    if (url.hash && url.hash.includes("access_token")) {
      const fragmentParams = new URLSearchParams(url.hash.slice(1));
      const accessToken = fragmentParams.get("access_token");
      if (accessToken != currentUserAccessToken) {
        saveAccessToken(accessToken);
        currentUserAccessToken = accessToken;
      }
      //console.log("Access Token:", accessToken);
    } else {
      console.log("URL does not contain access token.");
    }
  }
});

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "loadTwitchUrl") {
    // setIconForActiveWindow();
    startLiveCheck();
    sendResponse({ status: "success" });
  } else if (message.action === "stopLiveCheck") {
    chrome.runtime.sendMessage({
      action: "changePlayingIMG",
      changing: false,
    });
    stopLiveCheck();
    sendResponse({ status: "success" });
  } else if (message.action === "listUpdated") {
    streamURLS = message.mylist;
    //onsole.log(result);
  } else if (message.action === "authoUser") {
    setUsersAPI();
    //console.log(result);
  } else if (message.action === "getIsChecking") {
    chrome.runtime.sendMessage({
      action: "changePlayingIMG",
      changing: isChecking,
      currentURL: loadedURL,
    });
  } else if (message.action === "accessToken") {
    const responseURL = message.url;
    extractAccessTokenFromUrl(responseURL);
    //console.log(result);
  } else if (message.action === "PlayFollowedList") {
    startFollowerList();
  } else if (message.action === "listDeleted") {
    var key = message.key;
    // Remove the list with the specified key from local storage
    chrome.storage.local.remove(key, function () {
      console.log("List deleted:", key);
    });
  }
});
