import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PaymentTracker = () => {
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  // Assume user IDs are hardcoded for simplicity
  const currentUserId = 1;
  const friendUserId = 2;

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/balance/${currentUserId}/${friendUserId}`
      );
      const data = await response.json();
      setBalance(data.amount);
    } catch (error) {
      setError("Failed to fetch balance");
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/transactions/${currentUserId}/${friendUserId}`
      );
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      setError("Failed to fetch transactions");
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:3000/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerId: currentUserId,
          recipientId: friendUserId,
          amount: parseFloat(amount),
          description,
        }),
      });
      if (!response.ok) throw new Error("Payment failed");
      setAmount("");
      setDescription("");
      fetchBalance();
      fetchTransactions();
    } catch (error) {
      setError("Failed to process payment");
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Current Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">${balance}</p>
          <p className="text-sm text-gray-500">
            {balance >= 0 ? "You're owed" : "You owe"}
          </p>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Make a Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePayment} className="space-y-4">
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              required
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              required
            />
            <Button type="submit">Pay</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.map((transaction, index) => (
            <div key={index} className="mb-2">
              <p>
                {transaction.description}: ${transaction.amount}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(transaction.date).toLocaleDateString()}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PaymentTracker;
