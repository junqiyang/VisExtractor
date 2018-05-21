
var SummaryTool = require('node-summary');

var title = "Swayy is a beautiful new dashboard for discovering and curating online content [Invites]";
var content = "";
content += "Inside the 2 February edition.\n";
content += "Could the Montessori method help people with dementia?.\n";
content += "Home Office urged to refuse Polish far-right speaker entry to UK.\n";
content += "'Sorry, I've only got my card': can the homeless adapt to cashless society?.\n";
content += "Everything I'm actually interested in reading is in one place – I don't have to skip from another major tech blog over to Harvard Business Review then hop over to another major tech or business blog. It's all in there. And it has saved me So Much Time\n\n";
content += "After I decided that I trusted the service, I added my Facebook and LinkedIn accounts. The content just got That Much Better. I can share from the service itself, but I generally prefer reading the actual post first – so I end up sharing it from the main link, using Swayy more as a service for discovery.\n";
content += "I'm also finding myself checking out trending keywords more often (more often than never, which is how often I do it on Twitter.com).\n\n\n";
content += "The analytics side isn't as interesting for me right now, but that could be due to the fact that I've barely been online since I came back from the US last weekend. The graphs also haven't given me any particularly special insights as I can't see which post got the actual feedback on the graph side (however there are numbers on the Timeline side.) This is a Beta though, and new features are being added and improved daily. I'm sure this is on the list. As they say, if you aren't launching with something you're embarrassed by, you've waited too long to launch.\n";
content += "It was the suggested content that impressed me the most. The articles really are spot on – which is why I pinged Lior again to ask a few questions:\n";
content += "How do you choose the articles listed on the site? Is there an algorithm involved? And is there any IP?\n";
content += "Yes, we're in the process of filing a patent for it. But basically the system works with a Natural Language Processing Engine. Actually, there are several parts for the content matching, but besides analyzing what topics the articles are talking about, we have machine learning algorithms that match you to the relevant suggested stuff. For example, if you shared an article about Zuck that got a good reaction from your followers, we might offer you another one about Kevin Systrom (just a simple example).\n";
content += "Who came up with the idea for Swayy, and why? And what's your business model?\n";
content += "Our business model is a subscription model for extra social accounts (extra Facebook / Twitter, etc) and team collaboration.\n";
content += "The idea was born from our day-to-day need to be active on social media, look for the best content to share with our followers, grow them, and measure what content works best.\n";
content += "Who is on the team?\n";
content += "Ohad Frankfurt is the CEO, Shlomi Babluki is the CTO and Oz Katz does Product and Engineering, and I [Lior Degani] do Marketing. The four of us are the founders. Oz and I were in 8200 [an elite Israeli army unit] together. Emily Engelson does Community Management and Graphic Design.\n";
content += "If you use Percolate or read LinkedIn's recommended posts I think you'll love Swayy.\n";
content += "Want to try Swayy out without having to wait? Go to this secret URL and enter the promotion code thenextweb . The first 300 people to use the code will get access.\n";
content += "Image credit: Thinkstock";

SummaryTool.summarize(title, content, function(err, summary) {
    if(err) return console.log("Something went wrong man!");

    console.log(summary);

    // console.log("Original Length " + (title.length + content.length));
    // console.log("Summary Length " + summary.length);
    // console.log("Summary Ratio: " + (100 - (100 * (summary.length / (title.length + content.length)))));
});