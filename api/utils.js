//
// Copyright (c) 2016 Autodesk, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// by Cyrille Fauvel
// Autodesk Forge Partner Development
//
/*jshint esversion: 6 */

const rimraf =require ('rimraf') ;
const mkdirp =require ('mkdirp') ;

const fs =require ('fs') ;
const path =require ('path') ;
const zlib =require ('zlib') ;

class utils {

	static clearUrn (urn) {
		urn =urn.replace ('urn:', '') ;
		return (urn) ;
	}

	static safeUrnEncode (urn, padding) {
		padding =(padding === undefined ? true : padding) ;
		urn =urn.replace ('urn:', '').replace (/\+/g, '-').replace (/=/g, '_') ;
		while ( (urn.length % 4) !== 0 )
			urn +='_' ;
		return (urn) ;
	}

	static safeUrnDecode (urn) {
		urn =urn.replace (/-/g, '+').replace (/_/g, '=') ;
		return (urn) ;
	}

	static getVersion (versionId) {
		let results =versionId.match (/^urn:(.+)\?version=(\d+)$/) ;
		if ( !results || results.length != 3 )
			return (1) ;
		return (results [2]) ;
	}

	static path (pathname, closingSlash) {
		closingSlash =closingSlash || '/' ;
		return (path.normalize (path.join (__dirname, '/../', pathname)) + closingSlash) ;
	}

	static dataPath (pathname, closingSlash) {
		closingSlash =closingSlash || '/' ;
		return (path.normalize (path.join (__dirname, '/../data/', pathname)) + closingSlash) ;
	}

	static data (name, ext) {
		ext =ext || '.json' ;
		return (path.normalize (path.join (__dirname, '/../data/', name) + ext)) ;
	}

	static readFile (filename, enc) {
		return (new Promise ((fulfill, reject) => {
			fs.readFile (filename, enc, (err, res) => {
				if ( err )
					reject (err) ;
				else
					fulfill (res) ;
			}) ;
		})) ;
	}

	static writeFile (filename, content, enc, bRaw) {
		return (new Promise ((fulfill, reject) => {
			let pathname =path.dirname (filename) ;
			utils.mkdirp (pathname)
				.then ((pathname) => {
					fs.writeFile (filename, !bRaw && typeof content !== 'string' ? JSON.stringify (content) : content, enc, (err) => {
						if ( err )
							reject (err) ;
						else
							fulfill (content) ;
					}) ;
				})
			;
		})) ;
	}

	static json (name) {
		let filename =utils.data (name, '.json') ;
		return (new Promise ((fulfill, reject) => {
				utils.readFile (filename, 'utf8')
					.then ((res) => {
						try {
							fulfill (JSON.parse (res)) ;
						} catch ( ex ) {
							console.error (ex.message, name) ;
							reject (ex) ;
						}
					}, reject) ;
			})
		) ;
	}

	static jsonRoot (name) {
		let filename =path.normalize (name) ;
		return (new Promise ((fulfill, reject) => {
				utils.readFile (filename, 'utf8')
					.then ((res) => {
						try {
							fulfill (JSON.parse (res)) ;
						} catch ( ex ) {
							console.error (ex.message, name) ;
							reject (ex) ;
						}
					}, reject) ;
			})
		) ;
	}

	static jsonGzRoot (name) {
		let filename =path.normalize (name) ;
		return (new Promise ((fulfill, reject) => {
				utils.readFile (filename)
					.then ((res) => {
						zlib.gunzip (res, (err, dezipped) => {
							try {
								fulfill (JSON.parse (dezipped.toString ('utf-8'))) ;
							} catch ( ex ) {
								console.error (ex.message, name) ;
								reject (ex) ;
							}
						}) ;
					}, reject) ;
			})
		) ;
	}

	static filesize (filename) {
		return (new Promise ((fulfill, reject) => {
			fs.stat (filename, (err, stat) => {
				if ( err )
					reject (err) ;
				else
					fulfill (stat.size) ;
			}) ;
		})) ;
	}

	static fileexists (filename) {
		return (new Promise ((fulfill, reject) => {
			fs.stat (filename, (err, stat) => {
				if ( err ) {
					if ( err.code === 'ENOENT' )
						fulfill (false) ;
					else
						reject (err) ;
				} else {
					fulfill (true) ;
				}
			}) ;
		})) ;
	}

	static findFiles (dir, filter) {
		return (new Promise ((fulfill, reject) => {
			fs.readdir (dir, (err, files) => {
				if ( err ) {
					reject (err) ;
					return ;
				}
				if ( filter !== undefined && typeof filter === 'string' )
					files =files.filter ((file) => { return (path.extname (file) === filter) ; }) ;
				else if ( filter !== undefined && typeof filter === 'object' )
					files =files.filter ((file) => { return (filter.test (file)) ; }) ;
				fulfill (files) ;
			}) ;
		})) ;
	}

	static walkDirs (dir, done) {
		let results =[];
		fs.readdir (dir, (err, list) => {
			if ( err )
				return (done (err)) ;
			let pending =list.length ;
			if ( !pending )
				return (done (null, results)) ;
			list.forEach ((file) => {
				file =path.resolve (dir, file) ;
				fs.stat (file, (err, stat) => {
					if ( stat && stat.isDirectory () ) {
						utils.walkDirs (file, (err, res) => {
							results =results.concat (res) ;
							if ( !--pending )
								done (null, results) ;
						}) ;
					} else {
						results.push (file) ;
						if ( !--pending )
							done (null, results) ;
					}
				}) ;
			}) ;
		}) ;
	}

	static findFilesRecursive (dir, filter) {
		return (new Promise ((fulfill, reject) => {
			utils.walkDirs (dir, (err, results) => {
				if ( err )
					return (reject (err)) ;
				results =results.map ((file) => { return (file.substring (dir.length)) ; }) ;
				if ( filter !== undefined && typeof filter === 'string' )
					results =results.filter ((file) => { return (path.extname (file) === filter) ; }) ;
				else if ( filter !== undefined && typeof filter === 'object' )
					results =results.filter ((file) => { return (filter.test (file)) ; }) ;
				fulfill (results) ;
			}) ;
		})) ;
	}

	static unlink (filename) {
		return (new Promise ((fulfill, reject) => {
			fs.stat (filename, (err, stat) => {
				if ( err ) {
					if ( err.code === 'ENOENT' )
						fulfill (false) ;
					else
						reject (err) ;
				} else {
					fs.unlink (filename, (err) => {}) ;
					fulfill (true) ;
				}
			}) ;
		})) ;
	}

	static mv (oldname, newname) {
		return (new Promise ((fulfill, reject) => {
			fs.stat (oldname, (err, stat) => {
				if ( err ) {
					if ( err.code === 'ENOENT' )
						fulfill (false) ;
					else
						reject (err) ;
				} else {
					fs.rename (oldname, newname, (err) => {}) ;
					fulfill (true) ;
				}
			}) ;
		})) ;
	}

	static isCompressed (filename) {
		return (   path.extname (filename).toLowerCase () === '.zip'
			|| path.extname (filename).toLowerCase () === '.rar' // jshint ignore:line
			|| path.extname (filename).toLowerCase () === '.gz' // jshint ignore:line
		) ;
	}

	static _safeBase64encode (st) {
		return (st
				.replace (/\+/g, '-') // Convert '+' to '-'
				.replace (/\//g, '_') // Convert '/' to '_'
				.replace (/=+$/, '')
		) ;
	}

	static safeBase64encode (st) {
		return (Buffer.from (st).toString ('base64')
				.replace (/\+/g, '-') // Convert '+' to '-'
				.replace (/\//g, '_') // Convert '/' to '_'
				.replace (/=+$/, '')
		) ;
	}

	static _safeBase64decode (base64) {
		// Add removed at end '='
		base64 +=Array (5 - base64.length % 4).join('=') ;
		base64 =base64
			.replace (/\-/g, '+')   // Convert '-' to '+'
			.replace (/\_/g, '/') ; // Convert '_' to '/'
		return (base64) ;
	}

	static safeBase64decode (base64) {
		// Add removed at end '='
		base64 +=Array (5 - base64.length % 4).join('=') ;
		base64 =base64
			.replace (/\-/g, '+')   // Convert '-' to '+'
			.replace (/\_/g, '/') ; // Convert '_' to '/'
		return (Buffer.from (base64, 'base64').toString ()) ;
	}

	static readdir (pathname) {
		return (new Promise ((fulfill, reject) => {
			fs.readdir (pathname, (err, files) => {
				if ( err )
					reject (err) ;
				else
					fulfill (files) ;
			}) ;
		})) ;
	}

	static rimraf (pathname) {
		return (new Promise ((fulfill, reject) => {
			rimraf (pathname, (err) => {
				if ( err )
					reject (err) ;
				else
					fulfill (pathname) ;
			}) ;
		})) ;
	}

	static mkdirp (pathname) {
		return (new Promise ((fulfill, reject) => {
			mkdirp (pathname, (err) => {
				if ( err )
					reject (err) ;
				else
					fulfill (pathname) ;
			}) ;
		})) ;
	}

	static checkHost (req, domain) {
		//return ( domain === '' || req.headers.referer === domain ) ;
		return (true) ;
	}

	static returnResponseError (res, err) {
		let msg =err.message || err.statusMessage || 'Internal Failure' ;
		let code =err.code || err.statusCode || 500 ;
		if ( code === 'ENOENT' ) {
			code =404 ;
			msg ='Not Found' ;
		}
		res
		 	.status (code)
		 	.end (msg) ;
	}

	static accepts (req) {
		if ( req.header ('x-no-compression') !== undefined )
			return ('') ;
		let type =req.header ('Accept-Encoding') ;
		if ( /(gzip)/g.test (type) )
			return ('gzip') ;
		if ( /(deflate)/g.test (type) )
			return ('deflate') ;
		return ('') ;
	}

	static authorization (req) {
		let bearer =req.header ('Authorization') ;
		if ( bearer === undefined )
			return (null) ;
		let result =bearer.match (/^Bearer\s(.*)$/) ;
		if ( result )
			return (result [1]) ;
		return (null) ;
	}

	static csv (st) {
		let dbIds =st.split (',') ; // csv format
		dbIds =dbIds.map ((elt) => {
			let r =elt.match (/^(\d+)-(\d+)$/) ;
			if ( r === null ) {
				if ( elt === '*' )
					return (elt) ;
				return (parseInt (elt)) ;
			}
			let t =[] ;
			for ( let i =parseInt (r [1]) ; i <= parseInt (r [2]) ; i++ )
				t.push (i) ;
			return (t) ;
		}) ;
		//return (dbIds) ;
		return ([].concat.apply ([], dbIds)) ;
	}

	static logTimeStamp (msg) {
		msg =msg || '' ;
		let date =new Date () ;
		let hour =date.getHours () ;
		hour =(hour < 10 ? '0' : '') + hour ;
		let min =date.getMinutes () ;
		min =(min < 10 ? '0' : '') + min ;
		let sec =date.getSeconds () ;
		sec =(sec < 10 ? '0' : '') + sec ;
		let msec =date.getMilliseconds () ;
		console.log (hour + ':' + min + ':' + sec + ':' + msec + ' - ' + msg) ;
	}

	// https://github.com/joliss/promise-map-series
	static promiseSerie (array, iterator, thisArg) {
		let length =array.length ;
		let current =Promise.resolve () ;
		let results =new Array (length) ;
		let cb =arguments.length > 2 ? iterator.bind (thisArg) : iterator ;
		for ( let i =0 ; i < length ; i++ ) {
			current =results [i] =current.then (function (i) { // jshint ignore:line
				return (cb (array [i], i, array)) ;
			}.bind (undefined, i)) ;
		}
		return (Promise.all (results)) ;
	}

}

// Array.prototype.flatMap =(lambda) => {
//  	return (Array.prototype.concat.apply ([], this.map (lambda))) ;
// } ;

module.exports =utils ;