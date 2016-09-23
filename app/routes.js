var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
  res.render('index');
});

// Reset session at citizen/agent start
router.get('/:type', function (req, res, next) {
  req.session = {};
  next();
});

// Set up locals/session for all routes
router.all('*', function(req, res, next){

  var isPartnerFlow = typeof req.query.partner !== 'undefined';
  var claimantType = isPartnerFlow ? 'partner' : 'claimant';
  var answers = req.session.answers || { claimant: {}, partner: {} };

  res.locals.isPartnerFlow = isPartnerFlow;
  res.locals.claimantType = claimantType;
  req.session.answers = answers;

  next();
});

// Intercept outcome pages, check for partner
router.all('/:type/outcomes/:outcomeId', function (req, res, next) {
  var type = req.params.type;
  var isPartnerFlow = res.locals.isPartnerFlow;

  // Save outcome ID
  req.session.outcomeId = req.params.outcomeId;

  // No partner or not asked yet
  if (!isPartnerFlow || typeof req.query.partner === 'undefined') {
    res.redirect('/' + type + '/questions/partner');
  }

  next();
});

// Branching for citizens/agents
router.all('/:type/questions/uk-national', function (req, res, next) {
  var type = req.params.type;
  var ukNational = req.body.ukNational;
  var answers = req.session.answers;
  var claimantType = res.locals.claimantType;

  if (ukNational) {
    answers[claimantType].ukNational = ukNational;

    // UK national
    if (ukNational == 'yes') {
      answers[claimantType].isEEA = true;
      res.redirect('/' + type + '/outcomes/END001?' + claimantType);
    }

    // Non-UK national
    else if (ukNational == 'no') {
      res.redirect('/' + type + '/questions/nationality?' + claimantType);
    }

    else if (res.locals.isPartnerFlow && ukNational === 'unknown') {
      res.redirect('/' + type + '/outcomes/END003?' + claimantType);
    }
  }

  next();
});

router.all('/:type/questions/nationality', function (req, res, next) {
  var type = req.params.type;
  var nationality = req.body.nationality;
  var answers = req.session.answers;
  var claimantType = res.locals.claimantType;

  if (nationality) {
    answers[claimantType].nationality = nationality;

    // List countries, pull out names
    var listEEA = res.locals.countriesByEEA;
    var listNonEEA = res.locals.countriesByNonEEA;

    // EEA nationality
    if (listEEA.indexOf(nationality) !== -1) {
      answers[claimantType].isEEA = true;
      res.redirect('/' + type + '/questions/employee-status?' + claimantType);
    }

    // Non-EEA nationality
    else if (listNonEEA.indexOf(nationality) !== -1) {
      answers[claimantType].isEEA = false;
      res.redirect('/' + type + '/questions/refugee?' + claimantType);
    }
  }

  next();
});

router.all('/:type/questions/employee-status', function (req, res, next) {
  var type = req.params.type;
  var employeeStatus = req.body.employeeStatus;
  var answers = req.session.answers;
  var claimantType = res.locals.claimantType;

  if (employeeStatus) {
    answers[claimantType].employeeStatus = employeeStatus;

    // Employed
    if (employeeStatus.employed === 'true') {
      res.redirect('/' + type + '/outcomes/END002?' + claimantType);
    }

    // Self-employed or Not working
    else if (employeeStatus.selfEmployed === 'true' || employeeStatus.dontWork === 'true') {
      res.redirect('/' + type + '/outcomes/END003?' + claimantType);
    }
  }

  next();
});

router.all('/:type/questions/refugee', function (req, res, next) {
  var type = req.params.type;
  var refugee = req.body.refugee;
  var answers = req.session.answers;
  var claimantType = res.locals.claimantType;

  if (refugee) {
    answers[claimantType].refugee = refugee;

    // Refugee
    if (refugee === 'yes') {
      res.redirect('/' + type + '/outcomes/END008?' + claimantType);
    }

    // Non-refugee
    else if (refugee === 'no') {
      res.redirect('/' + type + '/questions/no-recourse-to-public-funds?' + claimantType);
    }

    else if (res.locals.isPartnerFlow && refugee === 'unknown') {
      res.redirect('/' + type + '/outcomes/END003?' + claimantType);
    }
  }

  next();
});

router.all('/:type/questions/partner', function (req, res, next) {
  var type = req.params.type;
  var partner = req.body.partner;
  var outcomeId = req.session.outcomeId;
  var answers = req.session.answers;
  var claimantType = res.locals.claimantType;

  if (partner) {
    answers[claimantType].partner = partner;

    if (partner === 'yes') {
      res.redirect('/' + type + '/questions/uk-national?partner');
    }

    else if (partner === 'no' && outcomeId) {
      res.redirect('/' + type + '/outcomes/' + outcomeId + '?partner');
    }
  }

  next();
});

router.all('/:type/questions/no-recourse-to-public-funds', function (req, res, next) {
  var type = req.params.type;
  var noRecourseToPublicFunds = req.body.noRecourseToPublicFunds;
  var answers = req.session.answers;
  var claimantType = res.locals.claimantType;

  if (noRecourseToPublicFunds) {
    answers[claimantType].noRecourseToPublicFunds = noRecourseToPublicFunds;

    // Stamped visa
    if (noRecourseToPublicFunds === 'yes') {
      res.redirect('/' + type + '/outcomes/END003?' + claimantType);
    }

    // No stamped visa
    else if (noRecourseToPublicFunds === 'no') {
      res.redirect('/' + type + '/outcomes/END009?' + claimantType);
    }

    else if (res.locals.isPartnerFlow && noRecourseToPublicFunds === 'unknown') {
      res.redirect('/' + type + '/outcomes/END003?' + claimantType);
    }
  }

  next();
});

module.exports = router;
