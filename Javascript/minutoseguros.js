/*
    DOC: Forma de chamar: minSegs.getLista(callBackFunction, feedURL);

             callBackFunction   -> funcao que sera chamada ao final da operacao
             feedURL            -> URL do feed

    Notar: Como o carregamento do feed é assincrono, é preciso a funcao callBackFunction acima, a fim de retornar o resultado.
                 O callBack é então chamada passando a lista de palavras.

            Formato da lista: objeto JSON -> [{"palavra":"Carro", "cnt": 20},etc...]


    P.e.:

    minSegs.getLista(teste, "blog/feed/");

    function teste(lista) {
            console.log("A palavra " + lista[0].palavra + " aparece " + lista[0].cnt + " vezes");
    }

                                                                                                                by Ender - 2015
*/

var minSegs = (function () {
    "use strict";

    /* DOC: palavras que não serão consideradas na pesquisa (artigos e preposições). 
            Palavras com apenas 1 letra serão igoradas
            Números serão ignorados
    */
    var BlackList = "os as um uns uma umas de do dos da das dum duma dum dumas em no nos na nas num nuns numa numas por pelo pelos pela pela com ao aos ante até após contra desde entre para por perante sem sob sobre daqui nele nela pela nesse nessa naquele naquela neste nesta que qual não",

        conteudoTodosPosts = "",
        listaTodos = [],
        listasIndividuais = [],
        http,
        callBack,

        sortJsonObj = function (obj, key, decrescente) {
            var sorted = [];

            if (!Object.keys) {
                /* DOC: importante: Object.keys nao funciona em versoes antigas do IE */
                return obj;
            }

            Object.keys(obj).sort(function (a, b) {
                return eval('obj[a].' + key + ' ' + (decrescente ? '<' : '>=') + ' obj[b].' + key + ' ? -1 : 1');
            }).forEach(function (k) {
                sorted.push(obj[k]);
            });
            return sorted;
        },

        contaPalavras = function (conteudo) {
            var i, j, search,
                lista = [],
                palavras = conteudo.split(" ");

            for (i = 0; i < palavras.length; i++) {
                /* DOC: considera apenas palavras com 2 ou mais letras */
                if (palavras[i].length < 2) { continue; }

                /* Ignorar números */
                if (!isNaN(palavras[i])) { continue; }

                /* DOC: compara com palabras da BlackList */
                search = new RegExp("(\\b" + palavras[i] + "\\b)", "gim");
                if (BlackList.match(search)) { continue; }

                for (j = 0; j < lista.length; j++) {
                    if (lista[j].palavra == palavras[i]) {
                        lista[j].cnt++;
                        break;
                    }
                }
                if (j >= lista.length) {
                    lista.push({"palavra": palavras[i], "cnt": 1});
                }
            }
            /* DOC: ordena do maior para o menor */
            lista = sortJsonObj(lista, "cnt");

            return lista;
        },

        processaFeed = function (feedXML) {
            var i, j, k, paragrafos, conteudo, contentEncoded, conteudoDestePost, titulo, item, div, itemDiv;
                
            item = feedXML.split("<item>");

            /* DOC: eh preciso usar este artificio devido a presenca de CDATA dentro do XML */
            div = document.createElement("div");
            
            for (i = 1; i < item.length; i++) {
                titulo = item[i].split("<title>")[1].split("</title>")[0];

                contentEncoded = item[i].split("<content:encoded><![CDATA[")[1].split("]]></content:encoded>")[0];
                
                /* DOC: eh preciso usar este artificio devido a presenca de CDATA */
                div.innerHTML = contentEncoded;
                paragrafos = div.getElementsByTagName("p");

                conteudoDestePost = "";

                /* DOC: ler cada um dos paragrafos, despresar os que nao sao efetivamente do comentario (p.e. ref. a outros posts, "Leia também", etc.) */
                for (k = 0; k < paragrafos.length; k++) {
                    conteudo = paragrafos[k].innerHTML.replace(/(<([^>]+)>)/ig, ""); // DOC: replace retira tags HTML

                    if (conteudo.indexOf("No related posts") != -1 || conteudo.indexOf("The post ") == 0) { continue; }

                    /* DOC: limpar acentuação e passa para lowercase */
                    conteudoDestePost += conteudo.replace(/[&\/\\#,+()\[\]$~%.'"“”:*?\!<>{}]/g, " ").toLowerCase();
                }

                /* DOC: elimina nl/cr */
                conteudoDestePost = conteudoDestePost.replace(/(\n|\r)/gm, ' ');

                listasIndividuais.push({"titulo": titulo, "lista": contaPalavras(conteudoDestePost)});

                conteudoTodosPosts += " " + conteudoDestePost;
            }

            listaTodos = contaPalavras(conteudoTodosPosts);

            if (typeof callBack == "function") { callBack(listasIndividuais, listaTodos); }
        },

        getLListPrivate = function (callBackFunction, URL) {
            if (!callBackFunction) {
                console.log("Faltou parametro callBackFunction");
                return null;
            }
            if (typeof callBackFunction != 'function') {
                console.log("callBackFunction precisa ser uma funcao");
                return null;
            }
            if (!URL) {
                console.log("Faltou a URL do feed");
                return null;
            }
            callBack = callBackFunction;

            http = new XMLHttpRequest();
            http.onreadystatechange = function () {
                if (http.readyState == 4) {
                    if (http.status == 200) {
                        /* DOC: Safari tem problema para processar <content:encoded>, então nao usar responseXml */
                        processaFeed(http.responseText);
                    } else {
                        console.log('Problema com a resposta. ' + http.status + '   url = ' + URL);
                        return null;
                    }
                }
            };
            http.open("GET", URL, true);
            http.send(null);
        };

    return {
        getLista: function (callBackFunction, URL) {
            getLListPrivate(callBackFunction, URL);
        }

    };
}());
