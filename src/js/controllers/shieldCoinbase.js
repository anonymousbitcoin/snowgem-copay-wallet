'use strict';

angular.module('copayApp.controllers').controller('shieldCoinbaseController', function($scope, $rootScope, $log, $timeout, $ionicScrollDelegate, $ionicHistory, addressbookService, profileService, lodash, $state, walletService, incomingData, popupService, platformInfo, bwcError, gettextCatalog, scannerService, networkStatsService) {

  var originalList;
  var CONTACTS_SHOW_LIMIT;
  var currentContactsPage;
  $scope.isChromeApp = platformInfo.isChromeApp;


  var hasWallets = function() {
    $scope.wallets = profileService.getWallets({
      onlyComplete: true
    });
    $scope.hasWallets = lodash.isEmpty($scope.wallets) ? false : true;
  };

  // THIS is ONLY to show the 'buy anons' message
  // does not has any other function.

  var updateHasFunds = function() {

    if ($rootScope.everHasFunds) {
      $scope.hasFunds = true;
      return;
    }

    $scope.hasFunds = false;
    var index = 0;
    lodash.each($scope.wallets, function(w) {
      walletService.getStatus(w, {}, function(err, status) {

        ++index;
        if (err && !status) {
          $log.error(err);
          // error updating the wallet. Probably a network error, do not show
          // the 'buy anons' message.

          $scope.hasFunds = true;
        } else if (status.availableBalanceSat > 0) {
          $scope.hasFunds = true;
          $rootScope.everHasFunds = true;
        }

        if (index == $scope.wallets.length) {
          $scope.checkingBalance = false;
          $timeout(function() {
            $scope.$apply();
          });
        }
      });
    });

    if($rootScope.privateBalance) {
      $scope.hasFunds = true;
      $rootScope.everHasFunds = true;
      $scope.shieldMessage = "Shield Coinbase";
    }
  };

  var updateWalletsList = function() {

    var networkResult = lodash.countBy($scope.wallets, 'network');

    $scope.showTransferCard = $scope.hasWallets && (networkResult.livenet > 1 || networkResult.testnet > 1);

    if ($scope.showTransferCard) {
      var walletsToTransfer = $scope.wallets;
      if (!(networkResult.livenet > 1)) {
        walletsToTransfer = lodash.filter(walletsToTransfer, function(item) {
          return item.network == 'testnet';
        });
      }
      if (!(networkResult.testnet > 1)) {
        walletsToTransfer = lodash.filter(walletsToTransfer, function(item) {
          return item.network == 'livenet';
        });
      }
      var walletList = [];
      lodash.each(walletsToTransfer, function(v) {
        walletList.push({
          color: v.color,
          name: v.name,
          recipientType: 'wallet',
          coin: v.coin,
          network: v.network,
          getAddress: function(cb) {
            walletService.getAddress(v, false, cb);
          },
        });
      });
      originalList = originalList.concat(walletList);
    }
  }

  var getCoin = function(address) {
    return 'anon';
  };

  var updateContactsList = function(cb) {
    addressbookService.list(function(err, ab) {
      if (err) $log.error(err);

      $scope.hasContacts = lodash.isEmpty(ab) ? false : true;
      if (!$scope.hasContacts) return cb();

      var completeContacts = [];
      lodash.each(ab, function(v, k) {
        completeContacts.push({
          name: lodash.isObject(v) ? v.name : v,
          address: k,
          email: lodash.isObject(v) ? v.email : null,
          recipientType: 'contact',
          coin: getCoin(k),
          getAddress: function(cb) {
            return cb(null, k);
          },
        });
      });
      var contacts = completeContacts.slice(0, (currentContactsPage + 1) * CONTACTS_SHOW_LIMIT);
      $scope.contactsShowMore = completeContacts.length > contacts.length;
      originalList = originalList.concat(contacts);
      return cb();
    });
  };

  var updateList = function() {
    $scope.list = lodash.clone(originalList);
    $timeout(function() {
      $ionicScrollDelegate.resize();
      $scope.$apply();
    }, 10);
  };

  $scope.openScanner = function() {
    var isWindowsPhoneApp = platformInfo.isCordova && platformInfo.isWP;

    if (!isWindowsPhoneApp) {
      $state.go('tabs.scan');
      return;
    }

    scannerService.useOldScanner(function(err, contents) {
      if (err) {
        popupService.showAlert(gettextCatalog.getString('Error'), err);
        return;
      }
      incomingData.redir(contents);
    });
  };

  $scope.showMore = function() {
    currentContactsPage++;
    updateWalletsList();
  };

  $scope.searchInFocus = function() {
    $scope.searchFocus = true;
  };

  $scope.searchBlurred = function() {
    if ($scope.formData.search == null || $scope.formData.search.length == 0) {
      $scope.searchFocus = false;
    }
  };

  $scope.findContact = function(search) {
    if (incomingData.redir(search)) {
      return;
    }

    if (!search || search.length < 2) {
      $scope.list = originalList;
      $timeout(function() {
        $scope.$apply();
      });
      return;
    }

    var result = lodash.filter(originalList, function(item) {
      var val = item.name;
      return lodash.includes(val.toLowerCase(), search.toLowerCase());
    });

    $scope.list = result;
  };

  $scope.goToAmount = function(item) {
    networkStatsService.getInfo((result) => {
      $scope.testnet = result.testnet;
      
      walletService.getZTotalBalance((result) => {
        $scope.zWallet = result.private ? true : false;
  
        $timeout(function() {
          item.getAddress(function(err, addr) {
            if (err || !addr) {
              //Error is already formated
              return popupService.showAlert(err);
            }
            $log.debug('Got toAddress:' + addr + ' | ' + item.name);
            return $state.transitionTo('tabs.send.amount', {
              recipientType: item.recipientType,
              toAddress: addr,
              toName: item.name,
              toEmail: item.email,
              toColor: item.color,
              coin: item.coin,
              zWallet: $scope.zWallet,
              testnet: $scope.testnet
            })
          });
        });
      })
    });

  };

  // This could probably be enhanced refactoring the routes abstract states
  $scope.createWallet = function() {
    $state.go('tabs.home').then(function() {
      $state.go('tabs.add.create-personal');
    });
  };

  $scope.buyAnon = function() {
    $state.go('tabs.home').then(function() {
      $state.go('tabs.buyandsell');
    });
  };

  $scope.$on("$ionicView.beforeEnter", function(event, data) {
    $scope.checkingBalance = true;
    $scope.formData = {
      search: null
    };
    originalList = [];
    CONTACTS_SHOW_LIMIT = 10;
    currentContactsPage = 0;
    hasWallets();
    walletService.getCoinbaseGeneratedAddresses((addresses, totalCoinbaseAmount) => {
        $scope.addresses = addresses;
        $scope.address = addresses[0];
        $scope.totalCoinbaseAmount = totalCoinbaseAmount;
    })
    $scope.generateZAddress();
  });

  $scope.$on("$ionicView.enter", function(event, data) {
    if (!$scope.hasWallets) {
      $scope.checkingBalance = false;
      return;
    }
    updateHasFunds();
    updateWalletsList();
    updateContactsList(function() {
      updateList();
    });
  });

  $scope.onSuccessConfirm = function() {
    $scope.sendStatus = '';
    $ionicHistory.nextViewOptions({
      disableAnimate: true,
      historyRoot: true
    });
    $state.go('tabs.send').then(function() {
      $ionicHistory.clearHistory();
      $state.transitionTo('tabs.home');
    });
  };

  $scope.shieldCoinbase = (tAddress) => {
    walletService.shieldCoinbase($scope.zAddress.address, tAddress, (result) => {
      if(result[0] === "Error") {
        $scope.shieldMessage = result[1].error.message;
      } else {
        $scope.coinbaseShielded = result.result.opid ? result.result.opid : null;
        $scope.shieldedValue = $scope.coinbaseShielded ? result.result.shieldingValue : 0;
      }
    })
  }
  $scope.onAddressSelect = function(address) {
    $scope.zAddress = address;
    // $scope.addr = address.address;
  }; 

  $scope.onAddressSelectTAddress = function(tAddress) {
    $scope.address = tAddress;
    // $scope.addr = address.address;
  };

  $scope.showAddressSelector = function() {
    // if ($scope.singleAddress) return;
    $scope.addressSelectorTitle = gettextCatalog.getString('Select a address');
    $scope.showAddresses = true;
  }; 

  $scope.showTAddressSelector = function() {
    // if ($scope.singleAddress) return;
    $scope.addressSelectorTitle = gettextCatalog.getString('Select a address');
    $scope.showTAddresses = true;
  };

  $scope.generateZAddress = () => {
    walletService.getZTransactions((addresses) => {
      let zAddresses = []
      let largestAddress = {
        balance: -1
      };

      if(addresses.length === 0) {
        $scope.generateZNewAddress();
      } else {
        addresses.forEach((val, ix) => {
          if (val.balance > largestAddress.balance)
          largestAddress = val;
          zAddresses.push(val) 
        })
  
        // $scope.addr = largestAddress.address
        $scope.zAddress = largestAddress
        $scope.zAddresses = zAddresses;
      }
    });
  }

  $scope.generateZNewAddress = () => {
    walletService.getNewZAddresss((address) => {

      // $scope.addr = address
      $scope.zAddress = address
    });
  }
  

});