import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new McpServer( {
    name: "Example Server",
    version: "1.0.0",
    description: "An example server using Model Context Protocol",
    capabilities: {
        resources: {},
        tools: {},
        prompts: {},
    }
} );

server.resource(
    "users",
    "users://all",
    {
        description: "A collection of all users",
        title: "Users",
        mineType: "application/json",
    },
    async uri => {
        const users = await import( "./data/users.json", {
            with: { type: "json" }
        } ).then( ( module ) => module.default );

        return {
            contents: [ 
                {
                    uri: uri.href,
                    text: JSON.stringify( users, null, 2 ),
                    mimeType: "application/json"
                },
            ]
        }
    }
)

server.resource(
    "user-detail",
    new ResourceTemplate( "users://{id}/profile", { list: undefined } ),
    {
        description: "A specific user by ID",
        title: "User",
        mineType: "application/json",
    },
    async( uri, { id } ) => {
        const users = await import( "./data/users.json", {
            with: { type: "json" }
        } ).then( ( module ) => module.default );

        const user = users.find( u => u.id === parseInt( id as string ) );
        
        if ( user === undefined ) {
            return {
                contents: [
                    {
                        uri: uri.href,
                        text: JSON.stringify( { error: "User not found" }, null, 2 ),
                        mimeType: "application/json"
                    },
                ]
            }
        }
        return {
            contents: [ 
                {
                    uri: uri.href,
                    text: JSON.stringify( user, null, 2 ),
                    mimeType: "application/json"
                },
            ]
        }
    }
)

server.tool( "create-user", "Create a new user in the database",
    {
        name: z.string(),
        email: z.string(),
        address: z.string(),
        phone: z.string()
    },
    {
        title: "Create User",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
    },
    async ( params ) =>  {
        try{
            const id = await createUser( params );
            return {
                content: [
                    { type: "text", text: `User created with ID: ${ id }` },
                ]
            }
        } catch ( error )
        {
            return {
                content: [
                    { type: "text", text: `Failed to save user` }
                ]
                
            }
        }
    }
)

server.tool( "create-random-user", "Create a new user in the database with random data",
    {},
    {
        title: "Create Random User",
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
    },
    async ( ) => { 
        const res = await server.server.request( {
            method: "sampling/createMessage",
            params: {
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Create a random user with a name, email, address, and phone number.`
                        }
                    }
                ],
                maxTokens: 1024,
            },
        }, CreateMessageResultSchema )
        
        if ( res.content.type !== "text" ) {
            return {
                content: [
                    { type: "text", text: `Failed to generate random user` }
                ]
            }
        }

        try
        {
            const user = JSON.parse( res.content.text );
            const id = await createUser( user );
            return {
                content: [
                    { type: "text", text: `Random user created with ID: ${ id }` },
                ]
            }
        } catch ( error ) {
            return {
                content: [
                    { type: "text", text: `Failed to parse random user data` }
                ]
            }
        }
        
    }
)


server.prompt( "generate-fakeuser", "Generate a fake user profile", {
    name: z.string()
},
    ( { name } ) =>
    {
        return {
            messages: [
                {
                    role: "user",
                    content: {
                        type: "text",
                        text: `Generate a fake user profile for ${ name }. The profile should include a name, email, address, and phone number.` 
                    }
                }
            ]
        }
    }
)


async function createUser( user: { name: string, email: string, address: string, phone: string } ): Promise<number> {
    const users = await import( "./data/users.json", {
        with: { type: "json" }
    } ).then( ( module ) => module.default );

    const id: number = users.length + 1 ;

    users.push( { id, ...user } );

    fs.writeFile( "./src/data/users.json", JSON.stringify( users, null, 2 ) );

    return id;
}

async function main () {
    const transport = new StdioServerTransport();
    await server.connect( transport );
}

main();