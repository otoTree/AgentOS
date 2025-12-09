'use client';

import { useState } from "react";
import ApiUsageViewer from "./api-usage-viewer";

interface Deployment {
    id: string;
    createdAt: Date;
    tool?: {
        name: string;
        description?: string | null;
    } | null;
    inputs: any;
    [key: string]: any;
}

export default function MarketplaceViewer({ deployments }: { deployments: any[] }) {
    // Group deployments by Tool ID (or Name if ID is not available in selection, but we have tool relation)
    // We want to show the LATEST deployment for each tool.
    
    // The passed deployments are already ordered by createdAt desc.
    // So the first occurrence of a toolId is the latest one.
    
    const toolsMap = new Map<string, Deployment>();
    
    deployments.forEach(dep => {
        // If deployment has a tool relation, use tool.name as key or tool.id if we selected it.
        // We didn't select tool.id in the server action explicitly, let's assume we did or can rely on name uniqueness within project for display
        // Actually, let's look at the object.
        // We need a unique key for the tool.
        if (dep.tool) {
             if (!toolsMap.has(dep.tool.name)) {
                 toolsMap.set(dep.tool.name, dep);
             }
        } else {
            // Legacy or unlinked deployment? Should not happen with migration, but fallback to "Main"
            if (!toolsMap.has("Main Tool")) {
                toolsMap.set("Main Tool", { ...dep, tool: { name: "Main Tool" } });
            }
        }
    });
    
    const uniqueTools = Array.from(toolsMap.values());
    
    const [selectedDeployment, setSelectedDeployment] = useState<Deployment>(uniqueTools[0]);

    if (uniqueTools.length === 0) {
        return <div className="text-center py-12 text-muted-foreground">No active tools available.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Left Column: Tools List & Info */}
              <div className="md:col-span-2 space-y-8">
                  
                  {/* Tool Selection */}
                  <section>
                      <h3 className="text-lg font-semibold mb-4">Available Tools</h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                          {uniqueTools.map((dep) => (
                              <button
                                key={dep.id}
                                onClick={() => setSelectedDeployment(dep)}
                                className={`text-left p-4 rounded-xl border transition-all ${
                                    selectedDeployment.id === dep.id
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'bg-card hover:border-primary/50'
                                }`}
                              >
                                  <div className="font-medium mb-1">{dep.tool?.name || "Unnamed Tool"}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-2">
                                      {dep.tool?.description || "No description."}
                                  </div>
                                  <div className="mt-3 flex items-center gap-2">
                                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                                          v{new Date(dep.createdAt).toLocaleDateString()}
                                      </span>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </section>

                  {/* Input Parameters for Selected Tool */}
                  <section className="border rounded-xl p-6 bg-card">
                      <h3 className="text-lg font-semibold mb-4">Input Parameters: {selectedDeployment.tool?.name}</h3>
                      {Array.isArray(selectedDeployment.inputs) && selectedDeployment.inputs.length > 0 ? (
                          <div className="space-y-3">
                              {selectedDeployment.inputs.map((input: any, idx: number) => (
                                  <div key={idx} className="flex items-start justify-between p-3 rounded-lg bg-muted/30 border">
                                      <div>
                                          <div className="font-mono text-sm font-bold text-primary">{input.name}</div>
                                          <div className="text-xs text-muted-foreground mt-1">Type: {input.type}</div>
                                      </div>
                                      <div className="text-xs font-mono bg-background px-2 py-1 rounded border">
                                          Default: {String(input.defaultValue)}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <p className="text-sm text-muted-foreground italic">No parameters required.</p>
                      )}
                  </section>
              </div>

              {/* Right Column: API Usage */}
              <div className="space-y-6">
                  <div className="border rounded-xl p-6 bg-card shadow-sm sticky top-24">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                          API Endpoint
                      </h3>
                      
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Method</label>
                              <div className="mt-1 font-mono text-sm bg-muted p-2 rounded border">POST</div>
                          </div>
                          
                          <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">URL</label>
                              <div className="mt-1 font-mono text-xs bg-muted p-2 rounded border break-all select-all">
                                  /api/run/{selectedDeployment.id}
                              </div>
                          </div>

                          <div className="pt-4 border-t">
                              <h4 className="text-sm font-medium mb-2">Curl Example</h4>
                              <ApiUsageViewer 
                                  key={selectedDeployment.id} // Re-mount when deployment changes
                                  deploymentId={selectedDeployment.id} 
                                  inputs={selectedDeployment.inputs} 
                              />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
    );
}