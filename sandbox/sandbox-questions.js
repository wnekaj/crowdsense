/* =========================================================================
   sandbox-questions.js — questions that run in the SANDBOX ONLY.

   Copied into sandbox/ by tools/build-sandbox.js and loaded between
   questions.js and app.js, so a question can be tried out at
   crowdsense.uk/sandbox/?day=<date> before it goes anywhere near the live
   game. An entry here replaces the live bank's entry for the same date, in
   the sandbox only. Once a question goes live, delete it from here.
   ========================================================================= */
(function(){
  "use strict";
  var EXTRA = [
    // none at the moment: 'rizz' (7 Oct) has gone live
  ];
  if (typeof CS_QUESTIONS === "undefined") return;
  EXTRA.forEach(function(q){
    for (var i = CS_QUESTIONS.length - 1; i >= 0; i--){
      if (CS_QUESTIONS[i].date === q.date) CS_QUESTIONS.splice(i, 1);
    }
    CS_QUESTIONS.push(q);
  });
})();
