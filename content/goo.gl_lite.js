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

goo_gl_lite = new function()
{
	const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
	getService(Components.interfaces.nsIClipboardHelper);

	var stringBundle;
	const notificationValue = "goo.gl lite notification";
	const iconURL = "chrome://goo.gl_lite/skin/icon_16x16.png";

	/**
	 * Basic initiation
	 */
	this.init = function()
	{
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", goo_gl_lite.popupshowing, false);
		stringBundle = document.getElementById("goo_gl_lite_strings");
	};

	/**
	 * Show/hide context menu entries on demand
	 */
	this.popupshowing = function()
	{
		gContextMenu.showItem("context-goo_gl_lite-current", !(gContextMenu.isContentSelected || gContextMenu.onTextInput || gContextMenu.onLink || gContextMenu.onImage || gContextMenu.onVideo || gContextMenu.onAudio)); // Shows Copy Goo.gl URL for This Page whenever Bookmark This Page is shown
		gContextMenu.showItem("context-goo_gl_lite-link", gContextMenu.onLink && !gContextMenu.onMailtoLink); // Shows Copy Goo.gl URL for Link Location whenver Bookmark this Link is shown.
		gContextMenu.showItem("context-goo_gl_lite-image-url", gContextMenu.onImage);
	};

	/**
	 * Makes a short url from long_url
	 * @param long_url long url, unescaped.
	 */
	this.make_short_url = function(long_url)
	{
		var req = new XMLHttpRequest();
		req.addEventListener("load", function()
		{
			var response = JSON.parse(req.responseText);
			if(response.error_message)
			{
				goo_gl_lite.error(stringBundle.getFormattedString("returned_error_message", [response.error_message]));
			}
			goo_gl_lite.notify(stringBundle.getFormattedString("copied_to_clipboard", [response.short_url, long_url]), "PRIORITY_INFO_MEDIUM");
			gClipboardHelper.copyString(response.short_url);
		}, false);
		req.addEventListener("error", function()
		{
			goo_gl_lite.error(stringBundle.getFormattedString("error_contacting", [req.status]));
		}, false);
		req.open("POST", "http://goo.gl/api/shorten?url=" + encodeURIComponent(long_url));
		req.setRequestHeader("X-Auth-Google-Url-Shortener", "true");
		req.send();
	};

	/**
	 * @param text Text of notification
	 * @param priorityKey key to specify priority, as string
	 */
	this.notify = function(text, priorityKey)
	{
		var notifyBox = window.getNotificationBox(top.getBrowser().selectedBrowser.contentWindow);
		notifyBox.removeAllNotifications(false);
		notifyBox.appendNotification("Goo.gl Lite: " + text, this.notificationValue, this.iconURL, notifyBox[priorityKey], null);
		setTimeout(function()
		{
		        notifyBox.removeAllNotifications(false);
		}, 5000);
	};

	this.error = function(error_text)
	{
		const creationFailed = stringBundle.getFormattedString("creation_failed", [error_text]);
		this.notify(creationFailed, "PRIORITY_WARNING_MEDIUM");
		throw new Error("[goo.gl lite] " + creationFailed);
	};

	this.make_from_current_page = function()
	{
		this.make_short_url(top.getBrowser().currentURI.spec);
	};

	this.make_from_link = function()
	{
		this.make_short_url(gContextMenu.linkURL);
	};

	this.make_from_image_url = function()
	{
		this.make_short_url(gContextMenu.target.src);
	};
}();

window.addEventListener("load", goo_gl_lite.init, false);
