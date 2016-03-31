var express = require('express');
var router = express.Router();
var basex = require('basex');
var client = new basex.Session("127.0.0.1", 1984, "admin", "admin");

client.execute("OPEN Colenso");

checkForXml = function ( url ) {
    if(url[url.length-1] == '/'
        && url[url.length-2] == 'l'
        && url[url.length-3] == 'm'
        && url[url.length-4] == 'x') {
        return true;
    }
    return false;
}

checkForTei = function ( url ) {
    if(url[url.length-1] == 'I'
        && url[url.length-2] == 'E'
        && url[url.length-3] == 'T'
        && url[url.length-4] == '/') {
        return true;
    }
    return false;
}

Array.prototype.contains = function ( string ){
    for (i in this){
        if (this[i] === string) return true;
    }
    return false;
}


/* GET home page. */
//(//name[@type='place'])[1]
router.get('/', function(req, res) {
    res.render('index', { title: 'SWEN Assignment Skelly' });
});

/* GET search page. */
router.get('/search', function(req, res) {
    var q = req.query.tei;
    console.log("Frodo")
    if(q != undefined) {
        console.log("Bilbo");
        client.execute("XQUERY doc('Colensodb/" + q + "')",
            function (error, result) {
                if (error) {
                    console.error(error);
                }
                else {
                    res.render('search', {doc: result.result, url: q, b: 1});
                }
            });
    }
    else{
            res.render('search');
        }

});



/**
 * The browse page presents documents in a tree like structure for ease of use.
 */
router.get('/browse/*', function(req, res){

    //First we get the url and parse it to give to the XQUERY db:list command.
    //This is so we can constrain our search based on where we are in the tree.
    var listParam = req.url;
    listParam = listParam.replace('/browse', '');
    listParam = listParam.replace('/*', '');
    listParam = listParam.replace('/', '');

    //Check to see if we opened an xml file.
    if(checkForXml(listParam)) {
        client.execute("XQUERY doc('Colensodb/" + listParam + "')",
            function (error, result) {
                if (error) {
                    console.error(error);
                }
                else {
                    res.render('browse', {fileResult: result.result});
                }
            });
    }
    else {

        //List all folders relevant to current path (ie: place in the tree)
        client.execute("XQUERY db:list('Colenso','" + listParam + "')",
            function (error, result) {
                if (error) {
                    console.error(error);
                }
                else {

                    /**
                     * urlLines: List of retured xml file paths.
                     * pathNodes: Names of folders in current branch of tree.
                     * branchNum: How deep we are into the tree.
                     * urls: list of links to be placed onto list of folder names.
                     */
                    var urlLines = result.result.split("\n");
                    var pathNodes = [];
                    var branchNum = listParam.split("/").length;
                    var urls = [];

                    //Now we need to fill up the 'pathNodes' and 'urls' arrays.
                    for (i = 0; i < urlLines.length; i++) {

                        //Making a new node consists of condensing all the xml file paths into one
                        //folder, depending on where we are in the tree (branchNum-1).

                        //We do this by splitting each file path into tokens, taking the token at
                        //the index [branchNum-1]. and adding it to the array if it is not already
                        //in it.
                        var url = urlLines[i].split("/");
                        if (pathNodes.indexOf(url[branchNum - 1]) < 0) {

                            pathNodes.push(url[branchNum - 1]);

                            //Now we build the link to be attached to this node using roughly the
                            //same method.
                            var newUrl = "";
                            for (j = 0; j <= branchNum - 1; j++) {

                                newUrl = newUrl.concat(url[j] + "/");

                            }
                            urls.push(newUrl);
                        }
                    }
                    res.render('browse', {link: urls, linkPath: pathNodes});
                }
            });
    }
});

/**
 *The stringSearch handler lists files containing the string entered
 */
router.get('/stringSearch', function(req, res) {

    //Grab the string entered.
    var q = req.query.stringSearch;
    //Check to see if it was an xml document.
    if(checkForXml(q)) {
        client.execute("XQUERY doc('Colensodb/" + q + "')",
            function (error, result) {
                if (error) {
                    console.error(error);
                }
                else {
                    res.render('search', {doc: result.result, url: q});
                }
            });
    }

    //Otherwise, handle the string by replacing operands and checking all the the documents
    //for occurrences of the string.
    else {
        //the /g signifies a GLOBAL replace. ftnot ftand ftor are the operands understood by
        //xquery.
        q = q
            .replace(/NOT/g, "' ftnot '")
            .replace(/AND/g, "' ftand '")
            .replace(/OR/g, "' ftor '");

        var urlLines; //List of all the files we are about to return.
        client.execute("XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0'; " +
            "for $p in *[.//text() contains text '" + q + "' using wildcards] return db:path($p)",
            function (error, result) {
                if (error) {
                    console.error(error);
                }
                else {
                    urlLines = result.result.split('\n'); //split the results into lines
                    res.render('search', { results: urlLines, hits: urlLines.length } )
                }
            });
    }
});

/**
 * Works the same as the searchString method, but handles xquery input.
 */
router.get('/xQSearch', function(req, res) {
    var q = req.query.xQSearch;
    if(checkForXml(q)) {
        client.execute("XQUERY doc('Colensodb/" + q + "')",
            function (error, result) {
                if (error) {
                    console.error(error);
                }
                else {
                    res.render('search', { doc: result.result, url: q } );
                }
            });
    }
    else {
        q = "XQUERY declare default element namespace 'http://www.tei-c.org/ns/1.0'; " + q;
        client.execute(q,
            function (error, result) {
                if (error) {
                    console.error(error);
                }
                else {
                    res.render('search', {doc: result.result});
                }
            });
    }
});

router.get('/edit', function(req,res) {
    var q = req.query.query;
    console.log(q);
    q = q.substring(0, q.length-1);
    client.execute("XQUERY doc('Colensodb/" + q + "')",
        function(error,result){
            if(error){
                console.error(error);
            }
            else {
                res.render('edit', { content: result.result, url: q });
            }
        });
});

router.get('/add', function(req, res) {
    res.render('add');
})

router.post('/upload', function(req,res) {
    var q = req.query.urlInput;
    console.log(q);
    if(req.file) {
        var url = q + req.file.originalname;
        var file = req.file.buffer.toString();
        console.log(file);
        client.execute('ADD TO ' + url + ' "' + file + '"',
            function (error, result) {
                if (error) {
                    console.error(error);
                }
                else {
                    res.render('add', { b: 1 });
                }
            });
    }
    else {
        res.render('add', { b: 2 });
    }
});

router.post('/save', function(req, res) {
    var q = req.query.query;
    if(q[q.length-1] == '/'){
        q = q.substring(0, q.length-1); //need to chop off last character '/'
    }
    var txt = req.body.txtEdit;
    client.replace(q, txt,
        function (error, result) {
           if(error) {
               console.error(error);
           }
           else {
               console.log(result.result);
               res.render('edit', { b: 1, content: txt, url: q })
           }
        });
});



module.exports = router;