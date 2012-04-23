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

	const consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
	const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

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
	const prefService = Cc["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	const prefBranch = prefService.getBranch(PREF_BRANCH_NAME);

	// var service = null;
	// var handler = null;

	/**
	 * @param serviceObj OAuthConsumer service
	 * @param successCallback function to call on success.  Takes a single string, the token
	 * @param errorCallback function to call on success.  Takes a single string, the error message
	 */
	function handleUserAuthorization(serviceObj, successCallback, errorCallback)
	{
		// service = serviceObj;
		getTokensFromCode(serviceObj.token, successCallback, errorCallback);
	};

	// Hack to exchange code for token.  Should be in OAuthConsumer
	/**
	 * @param code the access code
	 * @param successCallback function to call on success.  Takes a single string, the token
	 * @param errorCallback function to call on success.  Takes a single string, the error message
	 */
	function getTokensFromCode(code, successCallback, errorCallback)
	{
		sendTokenRequest({
			code: code,
			redirect_uri: OAUTH_COMPLETION_URL,
			scope: OAUTH_PARAMS.scope,
			grant_type: OAUTH_CODE_GRANT_TYPE
		}, successCallback, errorCallback);
	}

	/**
	 * @param parameters parameter object to encode and send
	 * @param successCallback function to call on success.  Takes a single string, the token
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
				successCallback(response.access_token);
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
		prefBranch.setCharPref("access_token", response.access_token);
		// Only get refresh token the first time, so we should be sure not to erase it
		if(response.refresh_token)
		{
			prefBranch.setCharPref("refresh_token", response.refresh_token);
		}
		prefBranch.setCharPref("token_type", response.token_type);
		var time = (new Date()).getTime();
		var expirationTime = time + (response.expires_in * 1000);
		prefBranch.setCharPref("expiration", expirationTime);
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

	/**
	 * Attempts to ensure the user is authorized, then calls the success callback or error callback as appropriate.
	 *
	 * @param successCallback function to call on successful authorization.  Takes a single string, the token
	 * @param errorCallback function taking a single string, an error message, to call on error
	 */
	function authorize(successCallback, errorCallback)
	{
		var time = (new Date()).getTime();
		var expiration = + prefBranch.getCharPref("expiration");
		var accessToken = prefBranch.getCharPref("access_token");
		if (accessToken && time < expiration)
		{
			successCallback(accessToken);
			return;
		}

		var refreshToken = prefBranch.getCharPref("refresh_token");
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

	/**
	 * Sends a request, authenticated or not, according to the user's preference
	 *
	 * @param message message to send, fitting the OAuth library's envelope
	 * @param callback function to call with response to request, success or failure, taking the XMLHttpRequest object
	 * @param authenticationErrorCallback function to call, taking a single error message, on authentication failure before the message is sent.
	 */
	function sendRequest(message, callback, authenticationErrorCallback)
	{
		if(prefBranch.getBoolPref("authenticate"))
		{
			authorize(function(token)
			{
				// XXX Since we're doing part of the OAuth flow, we mock a service with just the token and version
				var service =
				{
					name: OAUTH_PROVIDER_NAME,
					token: token,
					version: OAUTH_VERSION
				};
				OAuthConsumer.call(service, message, callback);
			}, authenticationErrorCallback);
		}
		else
		{
			var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Ci.nsIXMLHttpRequest);
			req.open(message.method, message.action);
			req.setRequestHeader("Content-Type", message.contentType);
			req.addEventListener("load", function()
			{
				callback(req);
			}, false); // XXX neither this nor oauthconsumer handles network-level errors.
			req.send(message.parameters);
		}
	}

	// We can not store any error callback in a field anywhere in the module, since the module is a singleton, and the error callbacks are specific to particular windows.
	/**
	 * Makes a short url from longUrl
	 *
	 * @param longUrl long url, unescaped.
	 * @param successCallback function to call on success, taking the short URL
	 * @param authenticationErrorCallback function to call on authentication error, taking a single string parameter, the error
	 * @param creationErrorCallback function to call on error creating URL, taking a single string parameter, the error
	 */
	this.makeShortUrl = function(longUrl, successCallback, authenticationErrorCallback, creationErrorCallback)
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
				creationErrorCallback(response.error.message);
			}
			var shortUrl = response.id;
			successCallback(shortUrl);
		}, authenticationErrorCallback);
	};
}();
