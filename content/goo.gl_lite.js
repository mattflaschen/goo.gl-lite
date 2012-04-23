/*
    goo.gl lite, url shortening without the extra weight.
    Copyright (C) 2009 Matthew Flaschen

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License along
    with this program; if not, write to the Free Software Foundation, Inc.,
    51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
*/

Components.utils.import("resource://goo_gl_lite/module.jsm");

goo_gl_lite = new function()
{
	const NOTIFICATION_VALUE = "goo.gl lite notification";
	const ICON_URL = "chrome://goo.gl_lite/skin/icon_16x16.png";

	const CLIPBOARD_HELPER = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper);

	var stringBundle;

	/**
	 * Show/hide context menu entries on demand
	 */
	function popupshowing()
	{
		gContextMenu.showItem("context-goo_gl_lite-current", !(gContextMenu.isContentSelected || gContextMenu.onTextInput || gContextMenu.onLink || gContextMenu.onImage || gContextMenu.onVideo || gContextMenu.onAudio)); // Shows Copy Goo.gl URL for This Page whenever Bookmark This Page is shown
		gContextMenu.showItem("context-goo_gl_lite-link", gContextMenu.onLink && !gContextMenu.onMailtoLink); // Shows Copy Goo.gl URL for Link Location whenver Bookmark this Link is shown.
		gContextMenu.showItem("context-goo_gl_lite-image-url", gContextMenu.onImage);
	};

	/**
	 * @param text Text of notification
	 * @param priorityKey key to specify priority, as string
	 */
	function notify(text, priorityKey)
	{
		var notifyBox = window.getNotificationBox(top.getBrowser().selectedBrowser.contentWindow);
		notifyBox.removeAllNotifications(false);
		var notification = notifyBox.appendNotification("Goo.gl Lite: " + text, NOTIFICATION_VALUE, ICON_URL, notifyBox[priorityKey], null);
		setTimeout(function()
		{
			notifyBox.removeNotification(notification);
		}, 5000);
	};

	function handleError(errorText)
	{
		notify(errorText, "PRIORITY_WARNING_MEDIUM");
		throw new Error("[goo.gl lite] " + errorText);
	};

	function handleAuthenticationError(details)
	{
		handleError(stringBundle.getFormattedString("authentication_failed", [details]));
	};

	function handleCreationError(errorText)
	{
		const creationFailed = stringBundle.getFormattedString("creation_failed", [errorText]);
		handleError(creationFailed);
	};

	function handleReturnedError(returnedMessage)
	{
		handleCreationError(stringBundle.getFormattedString("returned_error_message", [returnedMessage]));
	};

	function handleSuccess(shortUrl, longUrl)
	{
		notify(stringBundle.getFormattedString("copied_to_clipboard", [shortUrl, longUrl]), "PRIORITY_INFO_MEDIUM");
		CLIPBOARD_HELPER.copyString(shortUrl);
	}

	function makeShortUrl(longUrl)
	{
		goo_gl_lite_module.makeShortUrl(longUrl, function(shortUrl)
		{
			handleSuccess(shortUrl, longUrl);
		}, handleAuthenticationError, handleReturnedError);
	};

	/**
	 * Basic initiation
	 */
	this.init = function()
	{
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", popupshowing, false);
		stringBundle = document.getElementById("goo_gl_lite_strings");
	};

	this.make_from_current_page = function()
	{
		makeShortUrl(top.getBrowser().currentURI.spec);
	};

	this.make_from_link = function()
	{
		makeShortUrl(gContextMenu.linkURL);
	};

	this.make_from_image_url = function()
	{
		makeShortUrl(gContextMenu.target.src);
	};
}();

window.addEventListener("load", goo_gl_lite.init, false);
