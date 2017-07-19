$().ready( function(){
  console.log("Options loaded!");
  var config = {
    "icServer": "",
    "username": "",
    "password": ""
  }

  // Read config file
  chrome.storage.local.get('pureconnect_config', function (result) {
    if(result && result.pureconnect_config)
      config = result.pureconnect_config;
    if(config){
      $("#icServer").val(config.icServer);
      $("#username").val(config.username);
      $("#password").val(config.password);
    }
  });

  // Save in chrome storage
  var saveConfig = function(){
    chrome.storage.local.set({"pureconnect_config": config});
  }

  // On IC Server field change
  $("#icServer").change(function(){
    config.icServer = $(this).val();
    saveConfig();
  });

  // On Login field change
  $("#username").change(function(){
    config.username = $(this).val();
    saveConfig();
  });

  // On Password field change
  $("#password").change(function(){
    config.password = $(this).val();
    saveConfig();
  });

});
