import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { toast } from "sonner";

export default function ComponentsTest() {
  const [checked, setChecked] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);

  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-4xl font-bold">shadcn/ui Components Test Page</h1>
      <p className="text-muted-foreground">
        This page demonstrates all installed shadcn/ui components.
      </p>

      <Separator />

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Different button variants</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button onClick={() => toast.success("Toast notification works!")}>
            Test Toast
          </Button>
        </CardContent>
      </Card>

      {/* Form Elements */}
      <Card>
        <CardHeader>
          <CardTitle>Form Elements</CardTitle>
          <CardDescription>Input, Textarea, Label, Checkbox</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Enter your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Tell us about yourself" />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="terms"
              checked={checked}
              onCheckedChange={(value) => setChecked(value as boolean)}
            />
            <Label htmlFor="terms">Accept terms and conditions</Label>
          </div>
        </CardContent>
      </Card>

      {/* Badge and Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Badge & Avatar</CardTitle>
          <CardDescription>Status badges and user avatars</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
          <div className="flex gap-4">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
          </div>
        </CardContent>
      </Card>

      {/* Slider and Select */}
      <Card>
        <CardHeader>
          <CardTitle>Slider & Select</CardTitle>
          <CardDescription>Range slider and dropdown select</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Slider Value: {sliderValue[0]}</Label>
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              max={100}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label>Select Option</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Choose an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
                <SelectItem value="option3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Card>
        <CardHeader>
          <CardTitle>Dialog</CardTitle>
          <CardDescription>Modal dialogs</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
                <DialogDescription>
                  This is a modal dialog built with shadcn/ui.
                </DialogDescription>
              </DialogHeader>
              <p>Dialog content goes here.</p>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Tabs</CardTitle>
          <CardDescription>Tabbed navigation</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tab1">
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
              <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">Content for Tab 1</TabsContent>
            <TabsContent value="tab2">Content for Tab 2</TabsContent>
            <TabsContent value="tab3">Content for Tab 3</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Skeleton */}
      <Card>
        <CardHeader>
          <CardTitle>Skeleton</CardTitle>
          <CardDescription>Loading state placeholders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>

      {/* Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Empty State</CardTitle>
          <CardDescription>No results display</CardDescription>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No data found</EmptyTitle>
              <EmptyDescription>
                There are no items to display at the moment.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
