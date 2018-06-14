# Question Editor 

This is a plugin for editing questions on a TRC sheet.

This is based on the template at https://github.com/Voter-Science/TrcPluginTemplate

This provides a UI editor for questions. You can also get a textual format for the question for quickly applying multiple questions or copying them between sheets. 

# Textual Format 

The textual format for editing question is

```
Slug1
Answer1_1
Answer1_2
Answer1_3

Slug2|Description2
Answer2_1
Answer2_2
Answer2_3
Answer2_4
```

Notes:

1. Descriptions are optional 
2. 'Slug' is the api name for the question and should correspond to \[A-Z0-9_]+  
3. Leave a blank space between questions 


 

