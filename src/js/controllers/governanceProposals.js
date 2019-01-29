'use strict';

angular.module('copayApp.controllers').controller('governanceProposalsController', function($scope, $ionicModal, $log, governanceProposalService, gettextCatalog, externalLinkService, ongoingProcess) {


    $scope.$on("$ionicView.beforeEnter", function(event, data) {
      ongoingProcess.set('Loading Proposals', true);  
      governanceProposalService.list(function(err, proposals) {
            if (err) $log.error(err);
            $scope.proposals = proposals;
            ongoingProcess.set('Loading Proposals', false);
        });
    });
    $scope.openURLInBrowser = (proposal) => {
      var optIn = true;
      var title = null;
      var message = gettextCatalog.getString('View');
      var okText = gettextCatalog.getString('Open');
      var cancelText = gettextCatalog.getString('Go Back');
      externalLinkService.open(proposal.DataObject.url, optIn, title, message, okText, cancelText)
      // let url = {url: proposal.DataObject.url};

      // openURLService.handleURL(url);
    }
  // $scope.$on("$ionicView.beforeEnter", function(event, data) {
  //   $scope.isCordova = platformInfo.isCordova;
  //   $scope.isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP;
  //   $scope.isDevel = platformInfo.isDevel;
  //   $scope.appName = appConfigService.nameCase;
  //   configService.whenAvailable(function(config) {
  //     $scope.locked = config.lock && config.lock.method;
  //     if (!$scope.locked || $scope.locked == 'none')
  //       $scope.method = gettextCatalog.getString('Disabled');
  //     else
  //       $scope.method = $scope.locked.charAt(0).toUpperCase() + config.lock.method.slice(1);
  //   });
  // });

  $scope.openGovernanceProposalModal = function(proposal) {
    $ionicModal.fromTemplateUrl('views/modals/governance-proposal-info.html', {
      scope: $scope
    }).then(function(modal) {
      $scope.proposal = proposal
      $scope.proposal.paymentCycles = Math.floor((proposal.DataObject.end_epoch - proposal.DataObject.start_epoch) / 2629800) + 1;
      $scope.proposal.DataObject.start_epoch = new Date(proposal.DataObject.start_epoch * 1000).toLocaleString()
      $scope.proposal.DataObject.end_epoch = new Date(proposal.DataObject.end_epoch * 1000).toLocaleString()
      $scope.governanceProposalInfo = modal;
      $scope.governanceProposalInfo.show();
    });

    $scope.close = function() {
      $scope.governanceProposalInfo.hide();
    };
  };

});
