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