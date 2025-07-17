// Robust database file finder for iOS apps
// Save as database-finder.js and run with: frida -U -n "AppName" -l database-finder.js

function interceptFileManagerMethods() {
    try {
        const fileManager = ObjC.classes.NSFileManager;
        
        if (fileManager['- fileExistsAtPath:']) {
            Interceptor.attach(fileManager['- fileExistsAtPath:'].implementation, {
                onEnter: function(args) {
                    try {
                        var path = new ObjC.Object(args[2]).toString();
                        if (path.match(/\.(db|sqlite|sqlite3|wal|shm)$/i)) {
                            console.log(`[NSFileManager] Checking database file: ${path}`);
                        }
                    } catch (e) {
                        console.log(`Error in fileExistsAtPath hook: ${e}`);
                    }
                }
            });
        }
        
        if (fileManager['- contentsOfDirectoryAtPath:error:']) {
            Interceptor.attach(fileManager['- contentsOfDirectoryAtPath:error:'].implementation, {
                onEnter: function(args) {
                    try {
                        var path = new ObjC.Object(args[2]).toString();
                        console.log(`[NSFileManager] Listing directory: ${path}`);
                    } catch (e) {
                        console.log(`Error in contentsOfDirectoryAtPath hook: ${e}`);
                    }
                }
            });
        }
    } catch (e) {
        console.log(`Error setting up NSFileManager hooks: ${e}`);
    }
}

function interceptSQLiteFunctions() {
    const sqliteFunctions = [
        'sqlite3_open',
        'sqlite3_open_v2',
        'sqlite3_open16',
        'sqlite3_prepare_v2'
    ];
    
    sqliteFunctions.forEach(funcName => {
        try {
            const funcPtr = Module.findExportByName(null, funcName);
            if (funcPtr) {
                Interceptor.attach(funcPtr, {
                    onEnter: function(args) {
                        try {
                            const filename = funcName.includes('16') ? 
                                Memory.readUtf16String(args[0]) : 
                                Memory.readUtf8String(args[0]);
                            console.log(`[SQLite] ${funcName} called for: ${filename}`);
                        } catch (e) {
                            console.log(`Error in ${funcName} hook: ${e}`);
                        }
                    }
                });
            }
        } catch (e) {
            console.log(`Error setting up ${funcName} hook: ${e}`);
        }
    });
}

function interceptCoreData() {
    try {
        const coordinator = ObjC.classes.NSPersistentStoreCoordinator;
        if (coordinator && coordinator['- addPersistentStoreWithType:configuration:URL:options:error:']) {
            Interceptor.attach(coordinator['- addPersistentStoreWithType:configuration:URL:options:error:'].implementation, {
                onEnter: function(args) {
                    try {
                        const url = new ObjC.Object(args[4]);
                        console.log(`[CoreData] Store URL: ${url}`);
                    } catch (e) {
                        console.log(`Error in CoreData hook: ${e}`);
                    }
                }
            });
        }
    } catch (e) {
        console.log(`Error setting up CoreData hooks: ${e}`);
    }
}

// Main execution
function main() {
    interceptFileManagerMethods();
    interceptSQLiteFunctions();
    interceptCoreData();
    
    console.log('Database finder script loaded successfully. Monitoring file operations...');
    console.log('Interacting with the app will reveal database locations.');
}

// Delay execution to ensure all classes are loaded
setTimeout(main, 1000);
