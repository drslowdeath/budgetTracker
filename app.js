document.addEventListener("alpine:init", () => {
  const indexedDB =
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB ||
    window.shimIndexedDB;

  const dbName = "BudgetTrackerDB";
  const request = indexedDB.open(dbName, 3);

  let db;

  request.onupgradeneeded = (event) => {
    db = event.target.result;

    if (!db.objectStoreNames.contains("BudgetTracker")) {
      const store = db.createObjectStore("BudgetTracker", { keyPath: "id", autoIncrement: true });
      store.createIndex("date", "date", { unique: false });
      store.createIndex("availableFunds", "availableFunds", { unique: false });
      store.createIndex("endOfMonthFunds", "endOfMonthFunds", { unique: false });
      store.createIndex("expenses", "expenses", { unique: false });
    }
  };

  request.onsuccess = (event) => {
    db = event.target.result;
    console.log('DB opened successfully');
    Alpine.store("appState").loadBudgetData();
  };

  request.onerror = (event) => {
    console.error("There is a database error: ", event.target.errorCode);
  };

  function addBudgetData(date, startFunds, endFunds, expenses) {
    const transaction = db.transaction(["BudgetTracker"], "readwrite");
    const store = transaction.objectStore("BudgetTracker");
    const data = {
      date: date,
      availableFunds: startFunds,
      endOfMonthFunds: endFunds,
      expenses: expenses,
    };

    const request = store.add(data);
    request.onsuccess = (event) => {
      console.log('Data added successfully with key', event.target.result);
    };
    request.onerror = (event) => {
      console.log('Error adding data', event.target.error);
    };
  }

  function removeBudgetData(id, index) {
    const transaction = db.transaction(["BudgetTracker"], "readwrite");
    const store = transaction.objectStore("BudgetTracker");
    const request = store.delete(id);
    request.onsuccess = () => {
      console.log('Data deleted successfully');
      // Remove from the frontend
      const appState = Alpine.store("appState");
      appState.budgetTracker.dateArr.splice(index, 1);
      appState.budgetTracker.startFundsArr.splice(index, 1);
      appState.budgetTracker.endFundsArr.splice(index, 1);
      appState.budgetTracker.expensesArr.splice(index, 1);
      appState.budgetTracker.idArr.splice(index, 1);
    };
    request.onerror = (event) => {
      console.log('Error deleting data', event.target.error);
    };
  }

  function getFormattedDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  }

  const currentDate = getFormattedDate();

  Alpine.store("appState", {
    budgetTracker: {
      dateArr: [],
      startFundsArr: [],
      endFundsArr: [],
      expensesArr: [],
      idArr: [], // Add an array to store IDs
    },

    loadBudgetData() {
      if (!db) {
        console.error('Database is not initialized');
        return;
      }
      const transaction = db.transaction(["BudgetTracker"], "readonly");
      const store = transaction.objectStore("BudgetTracker");

      const request = store.getAll();
      request.onsuccess = (event) => {
        const data = event.target.result;
        const appState = Alpine.store("appState");
        data.forEach((item) => {
          appState.budgetTracker.dateArr.push(item.date);
          appState.budgetTracker.startFundsArr.push(item.availableFunds);
          appState.budgetTracker.endFundsArr.push(item.endOfMonthFunds);
          appState.budgetTracker.expensesArr.push(item.expenses);
          appState.budgetTracker.idArr.push(item.id); // Store the ID
        });
      };
      request.onerror = (event) => {
        console.log('Error retrieving data', event.target.error);
      };
    }
  });

  Alpine.data("budgetTracker", () => ({
    currentDate: `Time period ${currentDate}`,
    availableFundsForThisMonth: 0,
    fundsAtStartOfPeriod: 0,
    expenses: [],
    headings: [],
    headingExpense: [],
    inputs: {
      user: "",
      expense: 0,
      heading: "",
    },
    toggleOpen: false,
    toggleOpenArchive: {},
    budgetTracker: {}, // Ensure this is defined

    appendFunds() {
      const initialFunds = parseFloat(this.inputs.user) || 0;
      this.fundsAtStartOfPeriod = initialFunds.toFixed(2);
      this.availableFundsForThisMonth = initialFunds;
    },

    addExpense() {
      if (this.inputs.expense && this.inputs.heading) {
        this.expenses.push(this.inputs.expense);
        this.headings.push(this.inputs.heading);
        this.headingExpense.push(
          this.inputs.expense + " - " + this.inputs.heading
        );

        this.availableFundsForThisMonth -= this.inputs.expense;

        this.inputs.expense = "";
        this.inputs.heading = "";
      } else {
        alert("Please fill both values before submitting.");
      }
    },

    populateBudgetTracker() {
      this.budgetTracker.dateArr.push(this.currentDate);
      this.budgetTracker.startFundsArr.push(this.fundsAtStartOfPeriod);
      this.budgetTracker.endFundsArr.push(this.availableFundsForThisMonth.toFixed(2));

      const formattedExpenses = this.headingExpense.map(exp => `£${exp}`).join(", ");
      this.budgetTracker.expensesArr.push(formattedExpenses);

      addBudgetData(this.currentDate, this.fundsAtStartOfPeriod, this.availableFundsForThisMonth.toFixed(2), formattedExpenses);

      this.expenses.splice(0, this.expenses.length);
      this.headings.splice(0, this.headings.length);
      this.headingExpense.splice(0, this.headingExpense.length);

      this.availableFundsForThisMonth = 0;

      this.inputs.user = "";
      this.inputs.expense = "";
      this.inputs.heading = "";
    },

    removeExpense(index) {
      const expenseStr = this.headingExpense[index].split(' ')[0];
      const expenseValue = parseFloat(expenseStr);

      this.availableFundsForThisMonth += expenseValue;

      this.headingExpense.splice(index, 1);
      this.expenses.splice(index, 1);
      this.headings.splice(index, 1);
    },

    removeBudgetItem(index) {
      const id = this.budgetTracker.idArr[index];
      removeBudgetData(id, index);
    },

    init() {
      this.budgetTracker = Alpine.store("appState").budgetTracker; // Initialize budgetTracker
      this.loadBudgetData();
    },

    loadBudgetData() {
      Alpine.store("appState").loadBudgetData();
    },
  }));
});
