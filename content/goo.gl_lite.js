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

	this.button_command = function(e)
	{
		var req = new XMLHttpRequest();
		req.addEventListener("load", function()
		{
			var response = JSON.parse(req.responseText);
			if(response.error_message)
			{
				throw new Error("[goo.gl lite] Goo.gl gateway failed with error message: " + response.error_message);
			}
			gClipboardHelper.copyString(response.short_url);
		}, false);
		req.addEventListener("error", function()
		{
			throw new Error("[goo.gl lite] Goo.gl request failed with status: " + req.status);
		}, false);
		req.open("GET", "http://ggl-shortener.appspot.com/?url=" +
			 encodeURIComponent( top.getBrowser().currentURI.spec));

		req.send();
	};
}();