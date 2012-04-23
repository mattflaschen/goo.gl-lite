/*
    goo.gl lite, url shortening without the extra weight.
    Copyright (C) 2009-2012 Matthew Flaschen

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

var EXPORTED_SYMBOLS = ["goo_gl_lite_module"];

goo_gl_lite_module = new function()
{
	Components.utils.import("resource://oauthorizer/modules/oauth.js");
	Components.utils.import("resource://oauthorizer/modules/oauthconsumer.js");

	const Cc = Components.classes, Ci = Components.interfaces, Cr = Components.results;

	const CONSOLE_SERVICE = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
	const IO_SERVICE = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

	const KEY = "AIzaSyAC1J1zIznmnMaLtNZalUVcfz4lmqO9Xnk";

	const INSERT_URL = "https://www.googleapis.com/urlshortener/v1/url?key=" + KEY;
	const OAUTH_COMPLETION_URL = "http://localhost";
	const OAUTH_KEY = "624450853198.apps.googleusercontent.com";
	const OAUTH_SECRET ="UdIuTCCk-ggsagjibTOEues9";
	const OAUTH_CODE_GRANT_TYPE = "authorization_code";
	const OAUTH_REFRESH_GRANT_TYPE = "refresh_token";
	const OAUTH_PARAMS =
	{
		'xoauth_displayname': "goo.gl lite",
		'scope': 'https://www.googleapis.com/auth/urlshortener',
		'response_type': 'code'
	};

	const OAUTH_PROVIDER_NAME = "google2";
	const OAUTH_PROVIDER_DISPLAY_NAME = "Google";
	const OAUTH_PROVIDER_CALLS =
	{
		signatureMethod     : "HMAC-SHA1",
		userAuthorizationURL: "https://accounts.google.com/o/oauth2/auth",
		accessTokenURL      : "https://accounts.google.com/o/oauth2/token"
	};
	const OAUTH_VERSION = "2.0";

	const PREF_BRANCH_NAME = 'extensions.goo_gl_lite.';

	// var service = null;
	// var handler = null;

	function handleUserAuthorization(serviceObj, successCallback, errorCallback)
	{
		// service = serviceObj;
		getTokensFromCode(serviceObj.token, successCallback, errorCallback);
	};

	// Hack to exchange code for token
	function getTokensFromCode(token, successCallback, errorCallback)
	{

		sendTokenRequest({
			code: token,
			redirect_uri: OAUTH_COMPLETION_URL,
			scope: OAUTH_PARAMS.scope,
			grant_type: OAUTH_CODE_GRANT_TYPE
		}, successCallback, errorCallback);
	}

	/**
	 * @param parameters parameter object to encode and send
	 * @param successCallback function to call on success
	 * @param errorCallback function taking a single string, an error message, to call on error
	 */
	function sendTokenRequest(parameters, successCallback, errorCallback)
	{
		parameters.client_id = OAUTH_KEY;
		parameters.client_secret = OAUTH_SECRET;
		var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
		req.addEventListener("load", function()
		{
			var response = JSON.parse(req.responseText);
                        if(response.error)
                        {
                                errorCallback(response.error.message);
                        }
			else
			{
				storeAuthenticationDetails(response);
				successCallback();
			}
		}, false);

		req.addEventListener("error", function()
		{
			errorCallback("Authentication network request failed");
		}, false);

		req.open("POST", OAUTH_PROVIDER_CALLS.accessTokenURL);
		req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		var body = OAuth.formEncode(parameters);
		req.send(body);
	};

	function storeAuthenticationDetails(response)
	{
		var branch = getBranch();
		branch.setCharPref("access_token", response.access_token);
		// Only get refresh token the first time, so we should be sure not to erase it
		if(response.refresh_token)
		{
			branch.setCharPref("refresh_token", response.refresh_token);
		}
		branch.setCharPref("token_type", response.token_type);
		var time = (new Date()).getTime();
		var expirationTime = time + (response.expires_in * 1000);
		branch.setCharPref("expiration", expirationTime);
	};

	// Only Google's OAuth 1 is currently built in.
	function registerGoogleAuth2()
	{
		var myProviderCall = function(key, secret, completionURI)
		{
			var myProvider = OAuthConsumer.makeProvider(OAUTH_PROVIDER_NAME, OAUTH_PROVIDER_DISPLAY_NAME, key, secret, completionURI, OAUTH_PROVIDER_CALLS);
			myProvider.tokenRx = /code=([^&]*)/gi,
			myProvider.version = OAUTH_VERSION;
			myProvider.requestMethod = "POST";
			return myProvider;
		};
		OAuthConsumer._providers[OAUTH_PROVIDER_NAME] = myProviderCall;
	};

	function getBranch()
	{
		const prefService = Cc["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		return prefService.getBranch(PREF_BRANCH_NAME);
	}

	/**
	 * Attempts to authorize the user, then calls the success callback or error callback as appropriate.
	 *
	 * @param successCallback function to call on success
	 * @param errorCallback function taking a single string, an error message, to call on error
	 */
	function authorize(successCallback, errorCallback)
	{
		var branch = getBranch();
		var time = (new Date()).getTime();
		var expiration = + branch.getCharPref("expiration");
		var accessToken = branch.getCharPref("access_token");
		if (accessToken && time < expiration)
		{
			successCallback();
			return;
		}

		var refreshToken = branch.getCharPref("refresh_token");
		if(refreshToken)
		{
			sendTokenRequest(
			{
				refresh_token: refreshToken,
				grant_type: OAUTH_REFRESH_GRANT_TYPE
			}, successCallback, errorCallback);
			return;
		}

		// We should only get here the first time, or if they clear the preferences.  Otherwise, we'll at least have a refresh token.
		registerGoogleAuth2();
		OAuthConsumer.authorize(OAUTH_PROVIDER_NAME, OAUTH_KEY, OAUTH_SECRET, OAUTH_COMPLETION_URL, function(service)
		{
			handleUserAuthorization(service, successCallback, errorCallback);
		}, OAUTH_PARAMS);
	}

	function sendRequest(message, callback)
	{
		// XXX Since we're doing part of the OAuth flow, we mock a service with just the token and version
		var service =
		{
			token: getBranch().getCharPref("access_token"),
			version: OAUTH_VERSION
		};
		OAuthConsumer.call(service, message, callback);
	}

	function sendShortUrlRequest(longUrl, successCallback, errorCallback)
	{
		var message =
		{
			action: INSERT_URL,
			method: "POST",
			contentType: "application/json",
			parameters: JSON.stringify({longUrl: longUrl})
		};
		sendRequest(message, function(req)
		{
			var response = JSON.parse(req.responseText);
			if(response.error)
			{
				errorCallback(response.error.message);
			}
			var shortUrl = response.id;
			successCallback(shortUrl);
		});
	}

	// We can not store errorCallback in a field anywhere in the module, since the module is a singleton, and the errorCallback is specific to a particular window
	/**
	 * Makes a short url from longUrl
	 *
	 * @param longUrl long url, unescaped.
	 * @param successCallback function to call on success, taking the short URL
	 * @param errorCallback function to call on error, taking a single string parameter, the error
	 */
	this.makeShortUrl = function(longUrl, successCallback, authenticationErrorCallback, creationErrorCallback)
	{
		authorize(function()
		{
			sendShortUrlRequest(longUrl, successCallback, creationErrorCallback)
		}, authenticationErrorCallback);
	};
}();
