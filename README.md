# pureconnect_demo_extension
Allow you to demo PureConnect Digital Media (chat + callback) from a website.

Its a Chrome Extension that will insert in the page you are browsing a cx-widget like interface allowing you to start a callback or a chat.

Email / Webforms is not implemented


# Install
### Install the extension :
* Go to Chrome Extension configuration : chrome://extensions/
* Activate `Developer Mode` (top right)
* Click on `Load unpacked extension...`
* Select the folder `chrome_extension`

### Basic configuration :
* Click on the `options` button in the extension list for element `PureConnect Demo Extension`.
* Fill the options :
  * `ICServer` : the IP address or name of IC Server
  * `Username` : an ic admin Username
  * `Password` : the ic admin password

You don't need to save anything, parameters are saved as you fill the form.

You can now navigate to the website where you want to activate the widget!

# Configuration
The configuration of the extension is specific to each website.

It's accessible from Chrome extension icon with PureConnect's icon (top right corner) > Left click.

### Global tab
Select a color to change color set of the widget

### Callback tab
* `Queue` : Select a queue where to put the Callback
* `CRM Account Name` : Only select the priority next to the star icon
* `Custom Attributes` : You can add custom attribute to the callback interaction.
  * To use a dynamic content, you can click on the blue target to select an element of the page. After clicking on an element a popup appears. Copy the content of the popup to the "Element to click" input. Set an attribute name where to put the value of this element. Click `Add`.
  * You can also put a static string in the `Element to click` input included between double quotes (" ").
* `Message` : A popup message that will appear when the callback has been submitted.

### Chat tab
* `Queue` : Select a queue where to put the Callback
* `CRM Account Name` : Only select the priority next to the star icon
* `Custom Attributes` : You can add custom attribute to the callback interaction.
  * To use a dynamic content, you can click on the blue target to select an element of the page. After clicking on an element a popup appears. Copy the content of the popup to the "Element to click" input. Set an attribute name where to put the value of this element. Click `Add`.
  * You can also put a static string in the `Element to click` input included between double quotes (" ").
* `Welcome Message` : For future use.
* `Big logo` : For future use.
* `Small logo` : For future use.

### Troubleshooting
In case the configuration popup is stuck in loading mode : close the popup window and do `CTRL` + `F5` on the customer's website. Then you should be able to open the extension properly.
