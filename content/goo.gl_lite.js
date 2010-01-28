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

	const notificationValue = "goo.gl lite notification";
	const iconURL = "chrome://goo.gl_lite/skin/icon_16x16.png";

	/**
	 * Basic initiation
	 */
	this.init = function()
	{
		document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", goo_gl_lite.popupshowing, false);
	};

	/**
	 * Show/hide context menu entries on demand
	 */
	this.popupshowing = function()
	{
		gContextMenu.showItem("context-goo_gl_lite-current", !(gContextMenu.isContentSelected || gContextMenu.onTextInput || gContextMenu.onLink || gContextMenu.onImage || gContextMenu.onVideo || gContextMenu.onAudio)); // Shows Copy Goo.gl URL for This Page whenever Bookmark This Page is shown
		gContextMenu.showItem("context-goo_gl_lite-link", gContextMenu.onLink && !gContextMenu.onMailtoLink); // Shows Copy Goo.gl URL for Link Location whenver Bookmark this Link is shown.
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
				goo_gl_lite.error("Gateway returned error message: " + response.error_message);
			}
			goo_gl_lite.notify(response.short_url + " has been copied to the clipboard.  Shortened from " + long_url, "PRIORITY_INFO_MEDIUM");
			gClipboardHelper.copyString(response.short_url);
		}, false);
		req.addEventListener("error", function()
		{
			goo_gl_lite.error("Error contacting gateway.  Status code: " + req.status);
		}, false);
		req.open("GET", "http://ggl-shortener.appspot.com/?url=" +
			 encodeURIComponent(long_url));

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
	};

	this.error = function(error_text)
	{
		this.notify("Short URL creation failed: " + error_text, "PRIORITY_WARNING_MEDIUM");
		throw new Error("[goo.gl lite] Short URL creation failed: " + error_text);
	};

	this.make_from_current_page = function()
	{
		this.make_short_url(top.getBrowser().currentURI.spec);
	};

	this.make_from_link = function()
	{
		this.make_short_url(gContextMenu.linkURL);
	};
}();

window.addEventListener("load", goo_gl_lite.init, false);
