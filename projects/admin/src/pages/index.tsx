import React from 'react';
import { DEFAULT_CONFIG } from '@agentos/global';
import { Button, Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@agentos/web';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-background text-foreground">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Admin Panel - Welcome to {DEFAULT_CONFIG.name}</CardTitle>
          <CardDescription>Version {DEFAULT_CONFIG.version}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is the Admin dashboard using shared UI components.</p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Cancel</Button>
          <Button>Get Started</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
