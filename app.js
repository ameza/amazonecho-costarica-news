var alexa = require('alexa-app');
var app = new alexa.app('paradox150');
var striptags = require('striptags');
var config = require('./config/config');

var feedController = require('./controllers/feedController');

exports.handler = function(event, context) {

    console.info("Request:", event.request);

    if(event.request.intent) {
        if(event.request.intent.slots) {
            console.info('Slots:', event.request.intent.slots);
        }
    }
    else{
        console.log('here');
    }

    // Send requests to the alexa-app framework for routing
    app.lambda()(event, context);
};

app.sessionEnded(function(request,response) {
    // Clean up the user's server-side stuff, if necessary
    response.clearSession();
    // No response necessary
});

app.pre = function (request, response, type) {
    if(process.env.ALEXA_APP_ID) {
        if (request.sessionDetails.application.applicationId != 'amzn1.echo-sdk-ams.app.'+config.alexaAppId) {
            // Fail silently
            response.send();
        }
    }
};


// TODO: change this message before production release
app.error = function(error, request, response) {

        response.say("Something went wrong the Costa Rica News app: ");
    exitIntent(request,response);
};

app.launch(function (request, response){
    response.say("Welcome to Costa Rica News... Say start to get the latest news from Costa Rica, or help to receive some guidance...");
    response.shouldEndSession(false,"You can say: Start, or Help.");

});


function OnHelpIntent (request, response){

    var message=["Costa Rica news reads the latest news from Costa Rica. To get your news feed, open Costa Rica news and say Start.",
    "Costa Rica news will start reading the most recent group of news.",
    "If there are more news, you will be asked if you want to hear them, you can say: yes, more, or okay, to keep listening",
    "Say No, to make it stop" ,
    "Costa Rica news will stop when it's done reading, or when you ask alexa to Stop.",
    " Do you want to hear your news feed?"].join("<break time='500ms'/>");


    response.say(message);
    response.shouldEndSession(false, "You can say: yes, or no.");
};


app.intent(null, exitIntent)


app.intent('OnHelpIntent', {
    "utterances":["help","what can I ask you",
        "get help",
        "what do you do",
        "how can I use you",
        "help me"]
},OnHelpIntent)


function OnAboutIntent (request, response){

    var message=["Costa Rica news is an Amazon Echo Skill Created by Andres Meza in Costa Rica, for more info visit www.andresmeza.com.",
        " Do you want to hear your news feed?"
       ].join("<break time='500ms'/>");

    response.say(message);
    response.card("Costa Rica news is an Amazon Echo Skill Created by Andres Meza in Costa Rica. For more info visit www.andresmeza.com.",'http://www.andresmeza.com','http://www.andresmeza.com');
    response.shouldEndSession(false, "You can say: yes, or no.");
};
app.intent('OnAboutIntent', {
    "utterances":["about","Who created this app", "Who created this skill"]
},OnAboutIntent)




app.intent('OnStartIntent', {
    "utterances":["start"]
},OnStartIntent);


function OnStartIntent (request,response) {

    console.log('sources:'+config.newsSources.length);
    feedController.fetch(config.newsSources,function(postCollection) {

        var sayCount=0;
        var itemsToRemove=0;
        var endReached=false;
        var message='';
        var links = "Pura vida!!\r\nThe following are your news headings and the links to follow up: \r\n\r\n";
//        console.log(request.session);



       if (request && request.sessionAttributes && request.sessionAttributes.number) {

           for(var c=0; c<request.sessionAttributes.number; c++){
                postCollection.reverse().pop();
           }
           console.log('num: '+request.sessionAttributes.number+ 'post:'+postCollection);
           itemsToRemove+=request.sessionAttributes.number;

        }


        postCollection.forEach(function (item) {

           var toSay ='...'+ format(item.title) + '... ' + format(item.summary, item.title)+' <break time="1000ms"/> ';


            if ((sayCount+toSay.length)>=7900) {

                if (!endReached) {
                    message+='do you want to hear more ?';
                    console.log(message);
                     response.session('number',itemsToRemove);


                    response.say(message);
                    response.card('Costa Rica News by Andres Meza', links, 'http://google.com');
                    response.shouldEndSession(false,"You can say: yes, or no.");
                    response.send();
                    endReached=true;
                }

            }
            else {
                 itemsToRemove=itemsToRemove+1;
                 sayCount+=toSay.length;
                 message+=toSay;
                 links+= item.title+'\r\n'+item.link+'\r\n\r\n';



            }
        });
        if (!endReached){
            console.log(message);
            response.session('number',itemsToRemove);
            response.say(message);

            response.card('Costa Rica News by Andres Meza', links, 'http://google.com');
            response.say("That's the end of your news, thank you!");
            response.shouldEndSession(true);
            response.send();
            endReached=true;
        }


    });


    return false; // This is how you tell alexa-app that this intent is async.
}

app.intent('OnYesIntent', {
    "utterances":["yes","more","okay","ok"]
},OnStartIntent);



app.intent('OnNoIntent', {
        "utterances":["no","leave",
            "quit",
            "bye",
            "good bye",
            "stop",
            "cancel",
            "enough",
            "please stop"]
},exitIntent);


function exitIntent(request,response) {
    response.clearSession(); // or: response.clearSession('key') to clear a single value
    response.say("Thank you for using Costa Rica News, Good bye");
    response.send();
};


//remove some extra data from my sources
function format(string, title){

   if (string) {


       string = string.replace('&#8211;', '-');
       string = string.replace('The post', '');


       string = striptags(string);
       string = string.replace('appeared first on Costa Rica Star News', '')
       if (title) {
           string = string.substr(0, string.lastIndexOf(title));
           if (string.indexOf('. ') > -1)
               string = string.substr(0, string.lastIndexOf(". ") + 1);
       }
   }
    else
   {
       string="";
   }
    return string;

}


// Output the schema
console.log( "\n\nSCHEMA:\n\n"+app.schema()+"\n\n" );
// Output sample utterances
console.log( "\n\nUTTERANCES:\n\n"+app.utterances()+"\n\n" );