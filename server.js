/*
Adapted from https://github.com/sdrobs/HMA-Proxy-Scraper
*/

var express = require('express');
var request = require('request');
var app     = express();

var httpProxies = [];
//var url1 = 'http://proxylist.hidemyass.com/search-1311077/'
var url2 = 'http://www.hidemyass.com/proxy-list/'

function getProxies(index, responder){

	fakeNums = {};
	var i = ((index == 1) ? '' : index);

	request(url2 + i, function(err,res,body){
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

			callback(count, responder)
		}
		
	})

}

function callback(count, responder){
	var hma_proxy_list;
        var json = { hma_proxy_list: httpProxies};

	console.log('server.js: getProxies(): collected ' + count + ' proxies')

        console.log(JSON.stringify(json, null, 4));
        responder.send(JSON.stringify(json, null, 4))
	//console.log(httpProxies)
        //responder.send(JSON.stringify({'proxy_list': httpProxies})
}



app.get('/scrape', function(req, res){
    url = 'http://www.hidemyass.com/proxy-list/';
    responder = res
    index = 1
    getProxies(url, responder, index)

})
app.listen('8080')
console.log('Magic happens on port 8080');
exports = module.exports = app; 
