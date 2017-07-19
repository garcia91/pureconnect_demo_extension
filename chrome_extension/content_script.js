
// Loaded from global configuration
var _icServer = "";
var _username = "";
var _password = "";

// Connection to the extension
var _extension;
chrome.runtime.onConnect.addListener(function(port) {
  _extension = port;
  console.log("listener started ", port);

  // Wait for messages sent by the extension popup.
  port.onMessage.addListener(function(msg) {
    console.log(msg);
    if(msg.type)
    switch(msg.type){
      case "configReq": // Extension popup requests configuration from localstorage
      port.postMessage({
        "type": "configRes",
        "body" : JSON.parse(localStorage.getItem("pureconnect_demo"))
      });
      break;
      case "elementSelectorReq": // Extension popup requests user to select an element
      var myExampleClickHandler = function (element) {
        var path = $(element).getPath();
        prompt("Copy following path to element selector:", path);
        myDomOutline.stop();
      }
      var myDomOutline = DomOutline({
        onClick: myExampleClickHandler,
        filter: '*'
      });

      // Start outline:
      myDomOutline.start();
      break;
      case "configSaveReq": // Extension popup requests to save the configuration to localStorage
      localStorage.setItem("pureconnect_demo", JSON.stringify(msg.body));
      location.reload();
      break;
      case "webpagePicturesReq":
      port.postMessage({
        "type": "webpagePicturesRes",
        "body" : getWebpagePictures()
      });
      break;
    }
  });
});

// Add $.getPath to get full selector path of a given element
$.fn.extend({
  getPath: function () {
    var path, node = this;
    while (node.length) {
      var realNode = node[0], name = realNode.localName;
      if (!name) break;
      name = name.toLowerCase();

      var parent = node.parent();

      var sameTagSiblings = parent.children(name);
      if (sameTagSiblings.length > 1) {
        allSiblings = parent.children();
        var index = allSiblings.index(realNode) + 1;
        if (index > 1) {
          name += ':nth-child(' + index + ')';
        }
      }

      path = name + (path ? '>' + path : '');
      node = parent;
    }

    return path;
  }
});

function getWebpagePictures(){
  var pictures = [];
  $("[class]").each(function() {
    if($(this)[0].nodeName.toLowerCase() == "img"){
      pictures.push($(this)[0].src);
    }
    var background = $(this).css('background');
    var backgroundImage = $(this).css('background-image');
    if(background && background.indexOf('url')>0){
      pictures.push(background.split(/.*url\(['"]?([^"]*)['"]?\).*/gi)[1]);
    }
    if(backgroundImage && backgroundImage.indexOf('url')>0){
      pictures.push(backgroundImage.split(/.*url\(['"]?([^"]*)['"]?\).*/gi)[1]);
    }
  })
  return pictures;
}

/****************************************
*   PureConnect Login to ICWS
*/
var pureConnectLogin = function(){

  chrome.storage.local.get('pureconnect_config', function (result) {
    var config = result.pureconnect_config;
    if(config){
      _icServer = config.icServer;
      _username =  config.username;
      _password = config.password;
    }

    ICWS.start({
      applicationName: "PureConnect Demo Extension",
      username: _username,
      password: _password,
      icServerHostname: _icServer,
      loginSuccess: function(logonInfo){
        // Login successfull
        console.log("Check logon: ", logonInfo);

        if(logonInfo.errorId){
          displayAgentNotConnected();
        }
        else{
          // Keep track of ICWS session in localStorage to avoid login when refreshing the page
          localStorage.setItem("pureconnect_demo.sessionId", ICWS.sessionId);
          localStorage.setItem("pureconnect_demo.csrfToken", ICWS.csrfToken);
          localStorage.setItem("pureconnect_demo.username", ICWS.userID);
          localStorage.setItem("pureconnect_demo.icServer", logonInfo.icServer);

          Callback.icServer = _icServer;
          Chat.icServer = _icServer;

          console.log("[PureConnect] Login successful.", logonInfo);
          prepareWebPage();
        }
      }
    });

  });
}


pureConnectLogin();

var getConfig = function(){
  var config = localStorage.getItem("pureconnect_demo");
  if(config)
    return JSON.parse(config);
  else
    return undefined;
}


/*************************************************
*  Bind push to contact behaviour to the webpage
*/
var prepareWebPage = function(){
  console.log("Started !");

  var config = getConfig();
  if(!config)
  return;

    preparePCWidget(config);
}

var preparePCWidget = function(config){
  if(config.global.color){
    $("body").append("<style>\
    .cx-widget.cx-theme-custom .cx-svg-icon-tone1{fill: "+config.global.color+";} \
    .cx-widget.cx-theme-custom .cx-svg-icon-tone2{fill: "+config.global.color+";} \
    .cx-widget.cx-theme-custom *, .cx-widget.cx-theme-custom *:hover, .cx-widget.cx-theme-custom *:focus{ border-color: "+config.global.color+"; } \
    </style>");
  }

  $.get(chrome.runtime.getURL("mediaselection.html"), function(mediaselection){
    $("body").append(mediaselection);

    //TODO: Get estimated wait time
    /*
    routingApi.getQueuesQueueIdMediatypesMediatypeEstimatedwaittime(config.callback.queue.id, "CALLBACK")
    .then(function(result){
      var ewt = result.results[0].estimatedWaitTimeSeconds;
      var waitime = "Disponible";
      if(ewt){
        waitime = Math.round(ewt / 60) + " min" + ((Math.round(ewt / 60) > 1)?"s":"");
      }
      $("#pcwidget-chat-ewt").text(waitime);
    })
    .catch(function(error){
      console.log(error);
    });

    routingApi.getQueuesQueueIdMediatypesMediatypeEstimatedwaittime(config.callback.queue.id, "CALL")
    .then(function(result){
      var ewt = result.results[0].estimatedWaitTimeSeconds;
      var waitime = "Disponible";
      if(ewt){
        waitime = Math.round(ewt / 60) + " min" + ((Math.round(ewt / 60) > 1)?"s":"");
      }
      $("#pcwidget-call-ewt").text(waitime);
    })
    .catch(function(error){
      console.log(error);
    });
    */
  });

  $.get(chrome.runtime.getURL("callback.html"), function(callback){
    $("body").append(callback);
  });

  // Affiche du formulaire de callback
  var showCallbackForm = function(){

    moment.locale("fr");
    $("#current-date").text("Aujourd'hui, " + moment().format('LLL'));
    $("#pcwidget-callback").css("transform", "scale(1)");

    $("#pc-callback-button-close, #pcwidget-cancel-callback").click(function(){
      $("#pcwidget-callback").css("transform", "scale(0)");
    });

    $("#pcwidget-send-callback").click(function(e){
      e.preventDefault();
      var contact = {
        Account_Name: $("#cx_form_callback_firstname").val() + " " + $("#cx_form_callback_lastname").val(),
        Account_PhoneNumber: $("#cx_form_callback_phone_number").val()
      }
      getCallbackContactFromCRM(function(crmContact){
        if(crmContact){
          postCallback(crmContact);
          $("#pcwidget-callback").css("transform", "scale(0)");
          $("#pcwidget-send-callback").off();
        }
        else{
          postCallback(contact);
          $("#pcwidget-callback").css("transform", "scale(0)");
          $("#pcwidget-send-callback").off();
        }
      });
    });

    getCallbackContactFromCRM(function(crmContact){
      if(crmContact){
        $("#cx_form_callback_firstname").val(crmContact.Account_Name.split(" ")[0]);
        $("#cx_form_callback_lastname").val(crmContact.Account_Name.split(" ")[1]);
        $("#cx_form_callback_phone_number").val(crmContact.Account_PhoneNumber);
        $("#cx_form_callback_email").val(crmContact.Account_Email);
      }
    });
  }

  var showChat = function(){
    $.get(chrome.runtime.getURL("chatbox.html"), function(chatbox){
      content = chatbox;
      var popinDiv = '<div id="purecloud-chat-popin" style=" position: fixed; bottom: 0; right: 0;z-index: 99999;height:40%; display:none;">' + content + '</div>';

      $("#purecloud-chat-popin").remove();
      $("body").append(popinDiv);

      $("#pc-button-minimize").click(function(){
        $("#pc-widget-chat").toggleClass("minimized");
      })
      $("#pc-button-close, #purecloud-demo-cancelChat").click(function(){
        $("#purecloud-chat-popin").remove();
      })
      $("#purecloud-chat-popin").fadeIn(500);

      $("#purecloud-demo-startChat").click(function(){
        var contact = {
          "firstName":$("#cx_webchat_form_firstname").val(),
          "lastName":$("#cx_webchat_form_lastname").val(),
          "addressStreet":"",
          "addressCity":"",
          "addressPostalCode":"",
          "addressState":"",
          //"phoneNumber":$("#purecloud-demo-chat-phone").val(),
          "phoneType":"Cell",
          "customerId": "",
          "Account_Priority" : config.chat.accountPriority
        }

        $("#cx-body > div").fadeOut(300);
        $("#cx-body").css("height", "400px");

        startChat(contact);
      });

      getChatContactFromCRM(function(crmContact){
        if(crmContact){
          $("#cx_webchat_form_firstname").val(crmContact.Account_Name.split(" ")[0]);
          $("#cx_webchat_form_lastname").val(crmContact.Account_Name.split(" ")[1]);
          $("#cx_webchat_form_email").val(crmContact.Account_Email);
        }
      });

    });

  }

  // Affichage de la sidebar
  $.get(chrome.runtime.getURL("sidebar.html"), function(sidebar){
    $("body").append(sidebar);
    $(".cx-widget.cx-sidebar").click(function(){
      $("body #pcwidget-mediaselection").css("transform", "scale(1)");

      // Clic sur le média Callback
      $(".cx-channel.callback").click(function(){
        $("#pcwidget-mediaselection").css("transform", "scale(0)");
        showCallbackForm();
      });

      // Clic sur le média WebChat
      $(".cx-channel.webchat").click(function(){
        $("#pcwidget-mediaselection").css("transform", "scale(0)");
        showChat();
      });

      // Clic sur le bouton close du media selection
      $("#pc-mediaselection-button-close").click(function(){
        $("#pcwidget-mediaselection").css("transform", "scale(0)");
      });
    });
  });
}

// Get contact details for a callback
var getCallbackContactFromCRM = function(callback){
  var config = getConfig();
  if(config.callback.getCRMAccountInfo && config.callback.accountName){
    $.get("http://pcbridgefr.i3france.no-ip.org:3100/suitecrm/accounts/" + config.callback.accountName)
    .done(function(account){
      if(!account.id){
        callback(undefined);
      }
      else{
        console.log(account)

        var contactProperties = {
          Account_Id: account.id,
          Account_Name: account.name_value_list.name.value,
          Account_AddressLine: account.name_value_list.billing_address_street.value,
          Account_PostalCode: account.name_value_list.billing_address_postalcode.value,
          Account_City: account.name_value_list.billing_address_city.value,
          Account_Number: account.name_value_list.sic_code.value,
          Account_Country: account.name_value_list.billing_address_country.value,
          Account_PhoneNumber: account.name_value_list.phone_office.value,
          Account_Email: account.name_value_list.email1.value,
          Account_Balance: account.name_value_list.annual_revenue.value,
          RiskFactor: account.name_value_list.rating.value, //Math.ceil(Math.random()*1000)%12 + 1, // Digit from 1 to 12
          Customer_Type: account.name_value_list.account_type.value,
          Account_Priority: 10,
        }

        callback(contactProperties);
      }
    })
    .fail(function(){
      callback(undefined);
    })
  }
  else{
    callback(undefined);
  }
}

// Get contact details for a callback
var getChatContactFromCRM = function(callback){
  var config = getConfig();
  if(config.chat.getCRMAccountInfo && config.chat.accountName){
    $.get("http://pcbridgefr.i3france.no-ip.org:3100/suitecrm/accounts/" + config.callback.accountName)
    .done(function(account){
      console.log(account)

      var contactProperties = {
        Account_Id: account.id,
        Account_Name: account.name_value_list.name.value,
        Account_AddressLine: account.name_value_list.billing_address_street.value,
        Account_PostalCode: account.name_value_list.billing_address_postalcode.value,
        Account_City: account.name_value_list.billing_address_city.value,
        Account_Number: account.name_value_list.sic_code.value,
        Account_Country: account.name_value_list.billing_address_country.value,
        Account_PhoneNumber: account.name_value_list.phone_office.value,
        Account_Email: account.name_value_list.email1.value,
        Account_Balance: account.name_value_list.annual_revenue.value,
        RiskFactor: account.name_value_list.rating.value, //Math.ceil(Math.random()*1000)%12 + 1, // Digit from 1 to 12
        Customer_Type: account.name_value_list.account_type.value,
        Account_Priority: 10,
      }

      callback(contactProperties)
    }).fail(function(){
      callback(undefined);
    })
  }else{
    callback(undefined);
  }
}

// Post a callback to PureCloud
var postCallback = function(contact){
  var config = getConfig().callback;
  var queue = config.queue;
  if(!queue)
    return;

  if(config.customAttributes)
  config.customAttributes.forEach(function(ca){
    if(ca.element.startsWith("\"")){
      val = ca.element.substring(1,ca.element.length-1);
    }
    else{
      var $el = $(ca.element);
      var val = "";

      if(!$el.prop("tagName"))
      val = ca.element;
      else
      switch($el.prop("tagName")){
        case "INPUT":
        case "TEXTAREA":
        case "SELECT":
        val = $el.val();
        break;
        default:
        val = $el.text();
        break;
      }
    }
    contact[ca.name] = val.substring(0,100);
  });

  contact.WebpageURL = window.location.href.substring(0,100);

  Callback.targetWorkgroup = queue.id;
  Callback.start({
    subject: contact.subject?contact.subject:"Demande de rappel web",
    name: contact.Account_Name,
    phone: contact.Account_PhoneNumber,
    success: function(){
      alert(config.message);
    }
  });

}


// Post a chat to PureCloud
var startChat = function(contact){
  var config = getConfig().chat;
  var queue = config.queue;
  if(!queue)
    return;

  contact.WebpageURL = window.location.href;

  var companyLogoBig = "https://dhqbrvplips7x.cloudfront.net/webchat/1.0.23/company-logo-large-cea5ee47.png";
  var companyLogoSmall = "https://dhqbrvplips7x.cloudfront.net/webchat/1.0.23/company-logo-small-9c9fe09b.png";
  if(config.bigLogo) companyLogoBig = config.bigLogo;
  if(config.smallLogo) companyLogoSmall = config.smallLogo;

  Chat.initialize();
  Chat.targetWorkgroup = queue.id;
  Chat.start({
    subject: contact.subject?contact.subject:"Demande de chat",
    name: contact.firstName + " " + contact.lastName
  });

  $(".cx-body > .form").css("display", "none");
  $(".transcript-wrapper").css("display", "block");
  $(".input-container").css("display", "block");

}
