/*
Adapted from https://github.com/sdrobs/HMA-Proxy-Scraper
*/

var express = require('express');
var request = require('request');
var app     = express();
var httpProxies = [];
var url = 'http://www.hidemyass.com/proxy-list/'

function getProxies(index, route, responder){

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

			max = ips.length
			if(route=='latest'){
				max = 1
			}

			for(var i = 0; i < max; i++){
				if(types[i] == 'HTTP' || types[i] == 'HTTPS'){
					count++
					var address, port, type;
					httpProxies.push({address:ips[i], port:ports[i], type:types[i]})
				}
			}
			console.log('server.js: getProxies(): collected ' + count + ' proxies')
			if(route != 'latest'){
				getProxies(index+1, route, responder)
			}else{
				callback(responder, route)
			}
		}else{

			callback(responder, route)
		}	
	})
}

function callback(res, route){
	var hma_proxy_list, json;
        if(route == 'random'){
		json = { hma_proxy_list: [ httpProxies[Math.floor(Math.random()*httpProxies.length)] ] }
	}else{
        	json = { hma_proxy_list: httpProxies};
	}
        console.log(JSON.stringify(json, null, 4));
	res.send(json)
}

app.get('/', function(req, res){
    res.type('text/plain');
    message = "Welcome to proxylist-hidemyass.herokuapp.com!"
    console.log(message)
    res.send(message)
})

app.get('/all', function(req, res){
    httpProxies = []
    res.type('text/plain');
    message = "Fetching full proxylist"
    console.log(message)
    getProxies(1, 'all', res)
})

app.get('/latest', function(req, res){
    httpProxies = []
    res.type('text/plain');
    message = "Fetching latest proxy from proxylist"
    console.log(message)
    getProxies(1, 'latest', res)
})

app.get('/random', function(req, res){
    res.type('text/plain');
    message = "Fetching random proxy from proxylist"
    console.log(message)
    if(httpProxies.length > 1){
	callback(res, 'random')
    }else{
        httpProxies = []
        getProxies(1, 'random', res)
    }
})


// process.env.PORT lets the port be set by Heroku
var port = process.env.PORT || 8080;
app.listen(port)
console.log('Scraper happens on port 8080');
exports = module.exports = app; 
