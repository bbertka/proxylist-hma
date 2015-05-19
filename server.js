/*
Adapted from https://github.com/sdrobs/HMA-Proxy-Scraper
*/

var express = require('express');
var request = require('request');
var app     = express();
var httpProxies = [];
var url = 'http://www.hidemyass.com/proxy-list/'

function getProxies(index, responder){

	fakeNums = {};
	var i = ((index == 1) ? '' : index);

	request(url + i, function(err,res,body){
		if(!res || res.statusCode != 200)
			throw "Response code was not 200"

		var ips = []
		var ports = []
		var types = []

		body.replace(/\.(.*?)\{display\:none\}/g, function () {
		    //arguments[0] is the entire match
		    fakeNums[arguments[1]] = 1
		})

		body.replace(/<td>(.*?)<\/td>/g, function () {
			if(arguments[1] == "HTTP" || arguments[1] == "HTTPS" || arguments[1] == "socks4/5")
				types.push(arguments[1])
		})

		var trim = body
		trim = trim.replace(/\s/g,'')

		trim.replace(/<td>([0-9]+)<\/td>/g, function () {
			ports.push(arguments[1])
		})

		body.replace(/<\/style>(.*?)<\/td>/g, function () {
		    var temp = arguments[1]
		    temp = temp.replace(/<span class\=\"(.*?)\">.*?<\/span>/g,function(){
		    	if(fakeNums[arguments[1]]){
		    		return ''
		    	}
		    	return arguments[0]
		    })
		    temp = temp.replace(/<span style\=\"display\:none\">(.*?)<\/span>/g,"")
		    temp = temp.replace(/<div style\=\"display\:none\">(.*?)<\/div>/g,"")
		    temp = temp.replace(/<(.*?)>/g,'')
		    ips.push(temp)
		})

		var count = 0

		if(ips.length > 0){
			if(ports.length == 0 || ports.length != ips.length || ips.length != types.length)
				throw "Regex parsing has failed."

			for(var i = 0; i < ips.length; i++){
				if(types[i] == 'HTTP' || types[i] == 'HTTPS'){
					count++
					var address, port, type;
					httpProxies.push({address:ips[i], port:ports[i], type:types[i]})
				}
			}
			console.log('server.js: getProxies(): collected ' + count + ' proxies')
			getProxies(index+1, responder)
		}else{

			callback(responder)
		}	
	})
}

function callback(responder){
	var hma_proxy_list;
        var json = { hma_proxy_list: httpProxies};
        console.log(JSON.stringify(json, null, 4));
        responder.send(JSON.stringify(json, null, 4))
}

app.get('/', function(req, res){
    responder = res
    index = 1
    getProxies(index, responder)

})

// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;
app.listen(port)
console.log('Scraper happens on port 8080');
exports = module.exports = app; 
