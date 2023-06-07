document.addEventListener("DOMContentLoaded", function () {
  var loadButton = document.getElementById("loadButton");
  var stopButton = document.getElementById("stopButton");
  var editListButton = document.getElementById("editListButton");
  var backButton = document.getElementById("backButton");
  var saveButton = document.getElementById("saveButton");
  var addButton = document.getElementById("addButton"); /*existing code*/

  var playFollowed = document.getElementById("followedButton");

  var authoBTN = document.getElementById("authoBTN");

  var createButton = document.getElementById("newButton");
  var deletePButton = document.getElementById("deletePlaylist");

  var selectMenu = document.getElementById("playlist");
  selectMenu.addEventListener("change", playlistChange);

  createButton.addEventListener("click", createNewPlaylist);
  deletePButton.addEventListener("click", deletePlaylist);

  playFollowed.addEventListener("click", function () {
    // Send a message to the background script to load the Twitch URL
    var selectMenu = document.getElementById("playlist");
    const option = document.createElement("option");
    option.text = "Followed";
    option.value = "Followed"; // Set the value of the option
    selectMenu.add(option);
    selectMenu.selectedIndex = selectMenu.options.length - 1;

    chrome.runtime.sendMessage({ action: "PlayFollowedList" });
  });

  stopButton.addEventListener("click", function () {
    // Send a message to the background script to load the Twitch URL
    chrome.runtime.sendMessage({ action: "stopLiveCheck" });
  });

  /*
  authoBTN.addEventListener("click", function () {
    // Send a message to the background script to load the Twitch URL
    chrome.runtime.sendMessage({ action: "authoUser" });
  });
  */

  loadButton.addEventListener("click", function () {
    // Send a message to the background script to load the Twitch URL
    chrome.runtime.sendMessage({ action: "loadTwitchUrl" });
  });

  editListButton.addEventListener("click", openList);
  backButton.addEventListener("click", openList);
  saveButton.addEventListener("click", saveList);
  addButton.addEventListener("click", function () {
    openModal("listString");
  });

  //Get current key
  var savedValue;
  chrome.storage.local.get(["selectCurrentKey"], function (result) {
    savedValue = result.selectCurrentKey;
    console.log("saved key = " + savedValue);
  });

  getKeywordsLocally(function (list) {
    var selectMenu = document.getElementById("playlist");

    for (var i = 0; i < list.length; i++) {
      const option = document.createElement("option");
      option.text = list[i];
      option.value = list[i];
      selectMenu.add(option);
      selectMenu.value = "";
    }

    //Set current key
    for (var i = 0; i < selectMenu.options.length; i++) {
      console.log(selectMenu.options[i].text);
      if (selectMenu.options[i].text === savedValue) {
        // Set the selectedIndex to the matching option
        selectMenu.selectedIndex = i;
        playlistChange();
        break;
      }
    }
  });
});

var twitch = "twitch.tv/";
var keywordsList = [];

//Check if load script is running
chrome.runtime.sendMessage({ action: "getIsChecking" });

//Hides and unhides list
function openList() {
  var play = document.getElementById("loadButton");
  var stop = document.getElementById("stopButton");

  var followedBTN = document.getElementById("followedButton");

  var add = document.getElementById("addButton");
  var back = document.getElementById("backButton");

  var listCtn = document.getElementById("listContainer");

  if (play.style.display == "none") {
    play.style.display = "block";
    stop.style.display = "block";
    followedBTN.style.display = "block";
    editListButton.style.display = "block";

    add.style.display = "none";
    back.style.display = "none";
    listCtn.style.display = "none";
  } else {
    play.style.display = "none";
    stop.style.display = "none";
    followedBTN.style.display = "none";
    editListButton.style.display = "none";

    add.style.display = "block";
    back.style.display = "block";
    listCtn.style.display = "block";
  }
}

// Function to open the modal dialog AND ADD LIST ITEM
function openModal(type) {
  debugger;
  var modal = document.getElementById("myModal");
  var input = document.getElementById("valueInputM");
  input.value = "";

  var saveButtonM = document.getElementById("saveModalButton");
  var cancelButton = document.getElementById("cancelModalButton");

  if (type == "playString") {
    saveButtonM.onclick = function () {
      var value = input.value;
      value = value.replace(/\s/g, "");
      closeModal();

      if (value) {
        saveKeyword(value);
      }
    };
  } else if (type == "listString") {
    saveButtonM.onclick = function () {
      var value = twitch + input.value;
      value = value.replace(/\s/g, "");
      closeModal();

      if (value) {
        var ul = document.getElementById("playlistItems");
        var li = createListItem(value);
        ul.appendChild(li);
        saveList();
      }
    };
  }

  cancelButton.onclick = function () {
    closeModal();
  };

  modal.style.display = "block";
}

// Function to close the modal dialog
function closeModal() {
  var modal = document.getElementById("myModal");
  modal.style.display = "none";
}

//Adds buttons to list item
function createListItem(value) {
  var li = document.createElement("li");
  li.className = "list-item";

  var textDiv = document.createElement("div");
  textDiv.className = "text-column";
  textDiv.textContent = value;

  var buttonsDiv = document.createElement("div");
  buttonsDiv.className = "buttons-column";

  var upButton = document.createElement("button");
  upButton.textContent = "Up";

  var downButton = document.createElement("button");
  downButton.textContent = "Down";

  var trashButton = document.createElement("button");
  trashButton.textContent = "Trash";

  buttonsDiv.appendChild(upButton);
  buttonsDiv.appendChild(downButton);

  var trashDiv = document.createElement("div");
  trashDiv.className = "trash-column";
  trashDiv.appendChild(trashButton);

  li.appendChild(textDiv);
  li.appendChild(buttonsDiv);
  li.appendChild(trashDiv);

  upButton.addEventListener("click", function () {
    var listItem = this.parentElement.parentElement;
    var prevItem = listItem.previousElementSibling;
    if (prevItem) {
      listItem.parentElement.insertBefore(listItem, prevItem);
    }
  });

  downButton.addEventListener("click", function () {
    var listItem = this.parentElement.parentElement;
    var nextItem = listItem.nextElementSibling;
    if (nextItem) {
      listItem.parentElement.insertBefore(nextItem, listItem);
    }
  });

  trashButton.addEventListener("click", function () {
    var listItem = this.parentElement.parentElement;
    listItem.parentElement.removeChild(listItem);
    saveList(); // Save the updated list after removing the item
  });

  return li;
}

//Saves list locally
function saveList() {
  var selectMenu = document.getElementById("playlist");
  var selectedOption = selectMenu.options[selectMenu.selectedIndex];
  var key = selectedOption.text;
  var ul = document.getElementById("playlistItems");
  var items = ul.getElementsByTagName("li");

  var list = [];
  for (var i = 0; i < items.length; i++) {
    // Get the text content of the list item, excluding the button names
    var listItemText = items[i].childNodes[0].innerHTML.trim();
    list.push(listItemText);
  }

  // Save the list to local storage
  chrome.storage.local.set({ [key]: list }, function () {
    console.log("List saved:", list);

    // Send a message to background.js indicating that the list has been updated
    chrome.runtime.sendMessage({ action: "listUpdated", [key]: list });
  });
}

function getListLocally(key, callback) {
  // Retrieve the list from local storage
  chrome.storage.local.get([key], function (result) {
    var list = result[key] || [];

    if (typeof list === "undefined") {
      callback(false);
    } else {
      callback(list);
    }
  });
}

///Playlist

function createNewPlaylist() {
  openModal("playString");
}

function deletePlaylist() {
  var selectMenu = document.getElementById("playlist");
  var selectedOption = selectMenu.options[selectMenu.selectedIndex];
  var key = selectedOption.text;

  // Remove the selected item from local storage
  chrome.storage.local.remove(key, function () {
    console.log("Playlist deleted:", key);

    // Remove the selected item from the select menu
    selectMenu.remove(selectMenu.selectedIndex);

    // Clear the playlist items
    var ul = document.getElementById("playlistItems");
    ul.innerHTML = "";
    saveKeywords();

    // Send a message to background.js indicating that the playlist has been deleted
    chrome.runtime.sendMessage({ action: "playlistDeleted", key: key });

    // Send a message to background.js to delete the list with the same key
    chrome.runtime.sendMessage({ action: "listDeleted", key: key });
  });
}

function saveKeyword(keyword) {
  // Get the select element by its ID
  var selectElement = document.getElementById("playlist");

  // Get all options
  var options = Array.from(selectElement.options).map((option) => option.text);

  options.push(keyword);

  // Save the list to local storage
  chrome.storage.local.set({ keywords: options }, function () {
    console.log("List saved:", options);

    // Update the select menu visually
    updateSelectMenu(options);
    keywordsList = options;
  });
}

function saveKeywords() {
  // Get the select element by its ID
  var selectElement = document.getElementById("playlist");

  // Get all options
  var options = Array.from(selectElement.options).map((option) => option.text);
  // Save the list to local storage
  chrome.storage.local.set({ keywords: options }, function () {
    console.log("List saved:", options);

    // Update the select menu visually
    updateSelectMenu(options);
    keywordsList = options;
  });
}

function updateSelectMenu(keywords) {
  var selectMenu = document.getElementById("playlist");

  // Clear existing options
  selectMenu.innerHTML = "";

  // Create new options
  for (var i = 0; i < keywords.length; i++) {
    const option = document.createElement("option");
    option.text = keywords[i];
    option.value = keywords[i]; // Set the value of the option
    selectMenu.add(option);
  }
}

function getKeywordsLocally(callback) {
  chrome.storage.local.get(["keywords"], function (result) {
    var list = result.keywords || [];
    callback(list);
  });
}

function playlistChange() {
  var ul = document.getElementById("playlistItems");
  var selectMenu = document.getElementById("playlist");
  var selectedOption = selectMenu.options[selectMenu.selectedIndex];
  var key = selectedOption.text;

  ul.innerHTML = ""; // Clear existing list items

  chrome.storage.local.set({ selectCurrentKey: key }, function () {
    console.log("Saved current key: ", key);
  });

  getListLocally(key, function (list) {
    if (list === false) {
      // Handle the case when the file doesn't exist
      console.log("No saved file with key: " + key);
    } else {
      for (var i = 0; i < list.length; i++) {
        var li = createListItem(list[i]);
        ul.appendChild(li);
      }
      chrome.runtime.sendMessage({ action: "listUpdated", mylist: list });
    }
  });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "followersList") {
    const followersList = message.followers;
    updateListTemp(followersList);
  } else if (message.action === "changePlayingIMG") {
    if (message.changing) {
      var img = document.getElementById("playingIMG");
      var label = document.getElementById("loadedTwitchStream");
      label.textContent = message.currentURL;
      img.src = "16_playing.png";
    } else {
      var img = document.getElementById("playingIMG");
      var label = document.getElementById("loadedTwitchStream");
      img.src = "16_stopped.png";
      label.textContent = "Stopped";
    }
  }
});

function updateListTemp(followList) {
  var ul = document.getElementById("playlistItems");
  var selectMenu = document.getElementById("playlist");
  var selectedOption = selectMenu.options[selectMenu.selectedIndex];

  ul.innerHTML = ""; // Clear existing list items
  for (var i = 0; i < followList.length; i++) {
    var li = createListItem(followList[i]);
    ul.appendChild(li);
  }
}

//Adds buttons to list item
function createListItemTemp(value) {
  var li = document.createElement("li");
  li.className = "list-item";

  var textDiv = document.createElement("div");
  textDiv.className = "text-column";
  textDiv.textContent = value;

  var buttonsDiv = document.createElement("div");
  buttonsDiv.className = "buttons-column";

  var upButton = document.createElement("button");
  upButton.textContent = "Up";

  var downButton = document.createElement("button");
  downButton.textContent = "Down";

  var trashButton = document.createElement("button");
  trashButton.textContent = "Trash";

  buttonsDiv.appendChild(upButton);
  buttonsDiv.appendChild(downButton);

  var trashDiv = document.createElement("div");
  trashDiv.className = "trash-column";
  trashDiv.appendChild(trashButton);

  li.appendChild(textDiv);
  li.appendChild(buttonsDiv);
  li.appendChild(trashDiv);

  upButton.addEventListener("click", function () {
    var listItem = this.parentElement.parentElement;
    var prevItem = listItem.previousElementSibling;
    if (prevItem) {
      listItem.parentElement.insertBefore(listItem, prevItem);
    }
  });

  downButton.addEventListener("click", function () {
    var listItem = this.parentElement.parentElement;
    var nextItem = listItem.nextElementSibling;
    if (nextItem) {
      listItem.parentElement.insertBefore(nextItem, listItem);
    }
  });

  trashButton.addEventListener("click", function () {
    var listItem = this.parentElement.parentElement;
    listItem.parentElement.removeChild(listItem);
  });

  return li;
}
