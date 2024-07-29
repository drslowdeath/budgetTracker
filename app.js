document.addEventListener("alpine:init", () => {
  const indexedDB =
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB ||
    window.shimIndexedDB;

  const dbName = "BudgetTrackerDB";
  let db;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 3);

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
        resolve(db);
      };

      request.onerror = (event) => {
        console.error("There is a database error: ", event.target.errorCode);
        reject(event.target.errorCode);
      };
    });
  }

  async function initializeDatabaseAndLoadData() {
    try {
      await openDatabase();
      Alpine.store("appState").loadBudgetData();
    } catch (error) {
      console.error('Failed to initialize database and load data:', error);
    }
  }

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
      const id = event.target.result;
      console.log('Data added successfully with key', id);
      // Ensure the id is added to budgetTracker.idArr
      const appState = Alpine.store("appState");
      appState.budgetTracker.idArr.push(id);
    };
    request.onerror = (event) => {
      console.log('Error adding data', event.target.error);
    };
  }

  function removeBudgetData(id, index) {
    if (!id) {
      console.error('ID is undefined');
      return;
    }
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
      console.log(`Error deleting data with id: ${id} and index ${index}`, event.target.error);
    };
  }

  function editBudgetData(id, updatedInitialFunds, updatedExpenses) {
    if (!id) {
      console.error('ID is undefined');
      return;
    }
    const transaction = db.transaction(["BudgetTracker"], "readwrite");
    const store = transaction.objectStore("BudgetTracker");
    const request = store.get(id);
    request.onsuccess = (event) => {
      const data = event.target.result;
      // Update initial funds if provided
      if (updatedInitialFunds !== null) {
        data.availableFunds = updatedInitialFunds;
      }
      // Update expenses if provided
      if (updatedExpenses !== null) {
        data.expenses = updatedExpenses;
      }
      const updateRequest = store.put(data);
      updateRequest.onsuccess = () => {
        console.log("Data edited successfully");
        // Ensure frontend is updated if necessary
      };
      updateRequest.onerror = (event) => {
        console.log("Error updating data", event.target.error);
      };
    };
    request.onerror = (event) => {
      console.log("Error fetching data", event.target.error);
    };
  }
  
  function updateEndFunds(id, index) {
    if (!id) {
      console.error('ID is undefined');
      return;
    }
    const transaction = db.transaction(["BudgetTracker"], "readwrite");
    const store = transaction.objectStore("BudgetTracker");
    const request = store.get(id);
    request.onsuccess = (event) => {
      const data = event.target.result;
      const initialFunds = parseFloat(data.availableFunds) || 0;
  
      // Parse expenses to sum up values
      const expensesArray = data.expenses.split(", ").map(exp => parseFloat(exp.split(" - ")[0].replace("£", "")) || 0);
      const totalExpenses = expensesArray.reduce((acc, val) => acc + val, 0);
  
      const endFunds = initialFunds - totalExpenses;
      data.endOfMonthFunds = endFunds.toFixed(2);
  
      const updateRequest = store.put(data);
      updateRequest.onsuccess = () => {
        console.log("End funds updated successfully");
        // Ensure frontend is updated if necessary
        const appState = Alpine.store("appState");
        appState.budgetTracker.endFundsArr[index] = endFunds.toFixed(2);
      };
      updateRequest.onerror = (event) => {
        console.log("Error updating end funds", event.target.error);
      };
    };
    request.onerror = (event) => {
      console.log("Error fetching data", event.target.error);
    };
  }
  

  


  function updateEndFunds(id, index) {
  if (!id) {
    console.error('ID is undefined');
    return;
  }
  const transaction = db.transaction(["BudgetTracker"], "readwrite");
  const store = transaction.objectStore("BudgetTracker");
  const request = store.get(id);
  request.onsuccess = (event) => {
    const data = event.target.result;
    const initialFunds = parseFloat(data.availableFunds) || 0;
    
    // Parse expenses to sum up values
    const expensesArray = data.expenses.split(", ").map(exp => parseFloat(exp.split(" - ")[0].replace("£", "")) || 0);
    const totalExpenses = expensesArray.reduce((acc, val) => acc + val, 0);

    const endFunds = initialFunds - totalExpenses;
    data.endOfMonthFunds = endFunds.toFixed(2);
    
    const updateRequest = store.put(data);
    updateRequest.onsuccess = () => {
      console.log("End funds updated successfully");
      // Ensure frontend is updated if necessary
      const appState = Alpine.store("appState");
      appState.budgetTracker.endFundsArr[index] = endFunds.toFixed(2);
    };
    updateRequest.onerror = (event) => {
      console.log("Error updating end funds", event.target.error);
    };
  };
  request.onerror = (event) => {
    console.log("Error fetching data", event.target.error);
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
    logOnLoad() {
      console.log("appState store has loaded up ");
    },
    budgetTracker: {
      dateArr: [],
      startFundsArr: [],
      endFundsArr: [],
      expensesArr: [],
      idArr: [], 
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
    toggleOpenEdit: false,
    editingIndex: -1,
    budgetTracker: {},
    saveInitialFunds(index) {
      const id = this.budgetTracker.idArr[index];
      const updatedInitialFunds = this.budgetTracker.startFundsArr[index];
      editBudgetData(id, updatedInitialFunds, null);
      this.editingIndex = -1; // Reset editing state
      this.recalculateAndUpdate(index);
    },
    saveExpenses(index) {
      const id = this.budgetTracker.idArr[index];
      const updatedExpenses = this.budgetTracker.expensesArr[index];
      editBudgetData(id, null, updatedExpenses);
      this.editingIndex = -1; // Reset editing state
      this.recalculateAndUpdate(index);
    },
    recalculateAndUpdate(index) {
      const id = this.budgetTracker.idArr[index];
      
      // Parse expenses to sum up values
      const expensesArray = this.budgetTracker.expensesArr[index].split(", ").map(exp => parseFloat(exp.split(" - ")[0].replace("£", "")) || 0);
      const totalExpenses = expensesArray.reduce((acc, val) => acc + val, 0);
  
      const initialFunds = parseFloat(this.budgetTracker.startFundsArr[index]) || 0;
      const endFunds = initialFunds - totalExpenses;
      this.budgetTracker.endFundsArr[index] = endFunds.toFixed(2);
  
      // Call the function to update the backend
      updateEndFunds(id, index);
    },

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
      console.log(`Removing item with id: ${id}`);
      removeBudgetData(id, index);
    },

    async init() {
      this.budgetTracker = Alpine.store("appState").budgetTracker; // Initialize budgetTracker
      await initializeDatabaseAndLoadData();
    },

    loadBudgetData() {
      Alpine.store("appState").loadBudgetData();
    },
  }));
});
